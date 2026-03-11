"""
Google Ads API integration – todas las credenciales viven en .env del servidor.
Nunca se exponen al frontend ni se incluyen en el repositorio.
"""
import json
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from starlette import status
from .auth import get_current_user
from database import SessionLocal
from models import Campanas, SystemSettings
import os
import requests as http_requests

router = APIRouter(prefix="/google-ads", tags=["google-ads"])
user_dependency = Annotated[dict, Depends(get_current_user)]

GOOGLE_ADS_API_VERSION = "v20"
GOOGLE_ADS_BASE = f"https://googleads.googleapis.com/{GOOGLE_ADS_API_VERSION}"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]


def _require_admin(user: dict):
    if user is None or user.get("role") != "administrador":
        raise HTTPException(status_code=403, detail="Acceso solo para administradores")


def _get_google_config(db: Session) -> dict:
    """Lee credenciales de .env (secrets fijos) y tokens/customer_map de DB o .env.
    Prioridad refresh_token: DB > GOOGLE_ADS_REFRESH_TOKEN env var.
    Prioridad customer_map:  DB > GOOGLE_ADS_CUSTOMER_MAP env var (JSON).
    """
    db_refresh = (
        db.query(SystemSettings)
        .filter(SystemSettings.key == "google_ads_refresh_token")
        .first()
    )
    refresh_token = (db_refresh.value if db_refresh else None) or os.getenv(
        "GOOGLE_ADS_REFRESH_TOKEN"
    )

    # customer_map: base = .env JSON, sobreescrito por DB si existe
    customer_map: dict = {}
    env_map_str = os.getenv("GOOGLE_ADS_CUSTOMER_MAP", "")
    if env_map_str:
        try:
            customer_map = json.loads(env_map_str)
        except Exception:
            pass

    db_map = (
        db.query(SystemSettings)
        .filter(SystemSettings.key == "google_ads_customer_map")
        .first()
    )
    if db_map and db_map.value:
        try:
            customer_map.update(json.loads(db_map.value))
        except Exception:
            pass

    return {
        "developer_token": os.getenv("GOOGLE_ADS_DEVELOPER_TOKEN"),
        "client_id": os.getenv("GOOGLE_ADS_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_ADS_CLIENT_SECRET"),
        # MCC / Manager account (login-customer-id header). Deja vacío si no tienes MCC.
        "manager_id": os.getenv("GOOGLE_ADS_MANAGER_ID", "").replace("-", ""),
        # ID de cliente único (fallback si no hay customer_map configurado)
        "customer_id": os.getenv("GOOGLE_ADS_CUSTOMER_ID", "").replace("-", ""),
        "refresh_token": refresh_token,
        # Mapa marca → customer_id almacenado en DB
        "customer_map": customer_map,
    }


def _is_configured(cfg: dict) -> bool:
    base = all(cfg.get(k) for k in ["developer_token", "client_id", "client_secret", "refresh_token"])
    has_accounts = bool(cfg.get("customer_id") or cfg.get("customer_map"))
    return base and has_accounts


def _get_customer_id_for_marca(cfg: dict, marca: Optional[str]) -> str:
    """Devuelve el customer_id de Google Ads para la marca dada.
    Prioridad: customer_map (DB) > customer_id único (.env).
    """
    if marca and cfg.get("customer_map") and marca in cfg["customer_map"]:
        return str(cfg["customer_map"][marca]).replace("-", "")
    return cfg.get("customer_id", "")


def _get_access_token(cfg: dict) -> str:
    """Canjea refresh_token por access_token."""
    resp = http_requests.post(
        "https://oauth2.googleapis.com/token",
        json={
            "client_id": cfg["client_id"],
            "client_secret": cfg["client_secret"],
            "refresh_token": cfg["refresh_token"],
            "grant_type": "refresh_token",
        },
        timeout=15,
    )
    if not resp.ok:
        err = resp.json().get("error_description", resp.text[:200])
        raise HTTPException(status_code=503, detail=f"Error obteniendo token de Google: {err}")
    return resp.json()["access_token"]


def _gaql(access_token: str, developer_token: str, customer_id: str, query: str,
          manager_id: str = "") -> list:
    url = f"{GOOGLE_ADS_BASE}/customers/{customer_id}/googleAds:search"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "developer-token": developer_token,
        "Content-Type": "application/json",
    }
    # Si hay una MCC, se envía como login-customer-id para acceder a sub-cuentas
    if manager_id:
        headers["login-customer-id"] = manager_id
    resp = http_requests.post(
        url,
        headers=headers,
        json={"query": query},
        timeout=30,
    )
    if not resp.ok:
        raise HTTPException(status_code=502, detail=f"Google Ads API error: {resp.text[:300]}")
    return resp.json().get("results", [])


# ─── Status ────────────────────────────────────────────────────────────────────

@router.get("/status")
async def get_status(user: user_dependency, db: db_dependency):
    _require_admin(user)
    cfg = _get_google_config(db)
    return {
        "configured": _is_configured(cfg),
        "has_developer_token": bool(cfg.get("developer_token")),
        "has_credentials": bool(cfg.get("client_id") and cfg.get("client_secret")),
        "has_refresh_token": bool(cfg.get("refresh_token")),
        "has_manager_id": bool(cfg.get("manager_id")),
        "has_single_customer_id": bool(cfg.get("customer_id")),
        "customer_accounts": len(cfg.get("customer_map", {})),
        "customer_map": cfg.get("customer_map", {}),
    }


# ─── OAuth2 setup (solo para obtener el refresh_token por primera vez) ─────────

@router.get("/oauth/url")
async def get_oauth_url(user: user_dependency):
    """Genera la URL para que el admin autorice acceso a Google Ads."""
    _require_admin(user)
    client_id = os.getenv("GOOGLE_ADS_CLIENT_ID")
    if not client_id:
        raise HTTPException(status_code=503, detail="Falta GOOGLE_ADS_CLIENT_ID en el servidor")
    redirect_uri = os.getenv("GOOGLE_ADS_REDIRECT_URI", "http://localhost")
    url = (
        "https://accounts.google.com/o/oauth2/auth"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        "&response_type=code"
        "&scope=https://www.googleapis.com/auth/adwords"
        "&access_type=offline"
        "&prompt=consent"
    )
    return {"url": url, "redirect_uri": redirect_uri}


@router.post("/oauth/exchange")
async def exchange_oauth_code(payload: dict, user: user_dependency, db: db_dependency):
    """Canjea el código de autorización por un refresh_token y lo guarda en DB."""
    _require_admin(user)
    code = payload.get("code", "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Se requiere el código de autorización")

    client_id = os.getenv("GOOGLE_ADS_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_ADS_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail="Faltan GOOGLE_ADS_CLIENT_ID o CLIENT_SECRET en el servidor")

    redirect_uri = os.getenv("GOOGLE_ADS_REDIRECT_URI", "http://localhost")
    resp = http_requests.post(
        "https://oauth2.googleapis.com/token",
        json={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": redirect_uri,
        },
        timeout=15,
    )
    if not resp.ok:
        err = resp.json().get("error_description", resp.text[:200])
        raise HTTPException(status_code=400, detail=f"Error de autorización: {err}")

    refresh_token = resp.json().get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=400,
            detail="Google no devolvió refresh_token. Intenta de nuevo; asegúrate de no haberlo autorizado antes sin revocar acceso.",
        )

    # Guardar en DB (no en código, no en git)
    existing = (
        db.query(SystemSettings)
        .filter(SystemSettings.key == "google_ads_refresh_token")
        .first()
    )
    if existing:
        existing.value = refresh_token
    else:
        db.add(SystemSettings(key="google_ads_refresh_token", value=refresh_token))
    db.commit()

    return {"success": True, "message": "Google Ads conectado correctamente"}


@router.delete("/oauth/disconnect")
async def disconnect_google_ads(user: user_dependency, db: db_dependency):
    """Revoca la conexión eliminando el refresh_token de DB."""
    _require_admin(user)
    db.query(SystemSettings).filter(SystemSettings.key == "google_ads_refresh_token").delete()
    db.commit()
    return {"success": True}


# ─── Customer map (mapa marca → customer_id) ──────────────────────────────────

@router.get("/customer-map")
async def get_customer_map(user: user_dependency, db: db_dependency):
    """Devuelve el mapa actual de marca → customer_id de Google Ads."""
    _require_admin(user)
    row = db.query(SystemSettings).filter(SystemSettings.key == "google_ads_customer_map").first()
    if row and row.value:
        try:
            return json.loads(row.value)
        except Exception:
            pass
    return {}


@router.put("/customer-map")
async def set_customer_map(payload: dict, user: user_dependency, db: db_dependency):
    """Guarda el mapa de marca → customer_id en la DB.
    Ejemplo de payload: {"GWM Chihuahua": "1234567890", "Kia Juventud": "0987654321"}
    """
    _require_admin(user)
    # Validar que todos los valores sean strings no vacíos
    cleaned = {}
    for marca, cid in payload.items():
        if not marca or not str(cid).strip():
            continue
        cleaned[str(marca).strip()] = str(cid).strip().replace("-", "")

    row = db.query(SystemSettings).filter(SystemSettings.key == "google_ads_customer_map").first()
    if row:
        row.value = json.dumps(cleaned, ensure_ascii=False)
    else:
        db.add(SystemSettings(key="google_ads_customer_map", value=json.dumps(cleaned, ensure_ascii=False)))
    db.commit()
    return {"success": True, "cuentas_guardadas": len(cleaned), "mapa": cleaned}


# ─── Campañas de Google Ads ────────────────────────────────────────────────────

@router.get("/campanas")
async def list_gads_campaigns(
    user: user_dependency,
    db: db_dependency,
    marca: Optional[str] = Query(None, description="Marca / cuenta a consultar"),
):
    """Lista campañas de Google Ads con métricas del mes. Requiere ?marca= si hay múltiples cuentas."""
    _require_admin(user)
    cfg = _get_google_config(db)
    if not _is_configured(cfg):
        raise HTTPException(status_code=503, detail="Google Ads no configurado")

    customer_id = _get_customer_id_for_marca(cfg, marca)
    if not customer_id:
        # Si hay customer_map pero no se especificó marca, devolver lista de cuentas disponibles
        if cfg.get("customer_map"):
            raise HTTPException(
                status_code=400,
                detail=f"Especifica ?marca= con una de las cuentas: {list(cfg['customer_map'].keys())}",
            )
        raise HTTPException(status_code=503, detail="No hay customer_id configurado")

    token = _get_access_token(cfg)
    rows = _gaql(
        token,
        cfg["developer_token"],
        customer_id,
        """
        SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            campaign.start_date,
            campaign.end_date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.average_cpc,
            metrics.interactions,
            metrics.conversion_rate
        FROM campaign
        WHERE campaign.status != 'REMOVED'
            AND segments.date DURING THIS_MONTH
        ORDER BY metrics.cost_micros DESC
        """,
        manager_id=cfg.get("manager_id", ""),
    )

    results = []
    seen_ids = set()
    for row in rows:
        c = row.get("campaign", {})
        m = row.get("metrics", {})
        cid = c.get("id")
        if cid in seen_ids:
            continue
        seen_ids.add(cid)
        results.append(
            {
                "id": cid,
                "nombre": c.get("name"),
                "estado": c.get("status"),
                "fecha_inicio": c.get("startDate"),
                "fecha_fin": c.get("endDate"),
                "impresiones": int(m.get("impressions", 0) or 0),
                "clics": int(m.get("clicks", 0) or 0),
                "gasto": round((int(m.get("costMicros", 0) or 0)) / 1_000_000, 2),
                "conversiones": round(float(m.get("conversions", 0) or 0), 2),
                "ctr": round(float(m.get("ctr", 0) or 0) * 100, 2),
                "cpc_promedio": round((int(m.get("averageCpc", 0) or 0)) / 1_000_000, 2),
                "interacciones": int(m.get("interactions", 0) or 0),
                "tasa_conversion": round(float(m.get("conversionRate", 0) or 0) * 100, 2),
            }
        )
    return results


@router.get("/campanas/{gads_campaign_id}/anuncios")
async def list_campaign_ads(
    gads_campaign_id: str,
    user: user_dependency,
    db: db_dependency,
    marca: Optional[str] = Query(None),
):
    """Anuncios de una campaña con métricas y assets de imagen."""
    _require_admin(user)
    cfg = _get_google_config(db)
    if not _is_configured(cfg):
        raise HTTPException(status_code=503, detail="Google Ads no configurado")

    customer_id = _get_customer_id_for_marca(cfg, marca)
    if not customer_id:
        raise HTTPException(status_code=400, detail="Especifica ?marca= para identificar la cuenta")

    token = _get_access_token(cfg)
    rows = _gaql(
        token,
        cfg["developer_token"],
        customer_id,
        f"""
        SELECT
            ad_group_ad.ad.id,
            ad_group_ad.ad.name,
            ad_group_ad.ad.type,
            ad_group_ad.status,
            ad_group_ad.ad.final_urls,
            ad_group_ad.ad.responsive_search_ad.headlines,
            ad_group_ad.ad.responsive_search_ad.descriptions,
            ad_group_ad.ad.responsive_display_ad.long_headline,
            ad_group_ad.ad.responsive_display_ad.headlines,
            ad_group_ad.ad.responsive_display_ad.descriptions,
            ad_group_ad.ad.responsive_display_ad.marketing_images,
            ad_group_ad.ad.responsive_display_ad.square_marketing_images,
            ad_group_ad.ad.responsive_display_ad.logo_images,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.interactions
        FROM ad_group_ad
        WHERE campaign.id = {gads_campaign_id}
            AND ad_group_ad.status != 'REMOVED'
        ORDER BY metrics.impressions DESC
        """,
        manager_id=cfg.get("manager_id", ""),
    )

    results = []
    for row in rows:
        ad = row.get("adGroupAd", {}).get("ad", {})
        m = row.get("metrics", {})

        rsa = ad.get("responsiveSearchAd", {})
        titulos = [h.get("text", "") for h in rsa.get("headlines", []) if h.get("text")]
        descs = [d.get("text", "") for d in rsa.get("descriptions", []) if d.get("text")]

        rda = ad.get("responsiveDisplayAd", {})
        imagenes = []
        for campo, tipo in [
            ("marketingImages", "marketing"),
            ("squareMarketingImages", "square"),
            ("logoImages", "logo"),
        ]:
            for img in rda.get(campo, []):
                asset_resource = img.get("asset", "")
                if asset_resource:
                    asset_id = asset_resource.split("/")[-1]
                    imagenes.append({"tipo": tipo, "asset_id": asset_id})

        results.append(
            {
                "id": str(ad.get("id", "")),
                "nombre": ad.get("name") or f"Anuncio #{ad.get('id')}",
                "tipo": ad.get("type"),
                "estado": row.get("adGroupAd", {}).get("status"),
                "urls_finales": ad.get("finalUrls", []),
                "titulos": titulos[:3],
                "descripciones": descs[:2],
                "imagenes": imagenes,
                "impresiones": int(m.get("impressions", 0) or 0),
                "clics": int(m.get("clicks", 0) or 0),
                "gasto": round((int(m.get("costMicros", 0) or 0)) / 1_000_000, 2),
                "conversiones": round(float(m.get("conversions", 0) or 0), 2),
                "ctr": round(float(m.get("ctr", 0) or 0) * 100, 2),
                "interacciones": int(m.get("interactions", 0) or 0),
            }
        )
    return results


@router.get("/assets/{asset_id}/imagen")
async def proxy_asset_image(
    asset_id: str,
    user: user_dependency,
    db: db_dependency,
    marca: Optional[str] = Query(None),
):
    """Proxy para imágenes de Google Ads — el frontend nunca ve las credenciales."""
    _require_admin(user)
    cfg = _get_google_config(db)
    if not _is_configured(cfg):
        raise HTTPException(status_code=503, detail="Google Ads no configurado")

    customer_id = _get_customer_id_for_marca(cfg, marca)
    if not customer_id:
        raise HTTPException(status_code=400, detail="Especifica ?marca= para identificar la cuenta")

    token = _get_access_token(cfg)
    rows = _gaql(
        token,
        cfg["developer_token"],
        customer_id,
        f"""
        SELECT asset.id, asset.image_asset.full_size.url
        FROM asset
        WHERE asset.id = {asset_id}
        """,
        manager_id=cfg.get("manager_id", ""),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Asset no encontrado")

    image_url = (
        rows[0].get("asset", {}).get("imageAsset", {}).get("fullSize", {}).get("url")
    )
    if not image_url:
        raise HTTPException(status_code=404, detail="Este asset no tiene imagen disponible")

    img_resp = http_requests.get(image_url, timeout=20)
    if not img_resp.ok:
        raise HTTPException(status_code=404, detail="No se pudo obtener la imagen")

    return Response(
        content=img_resp.content,
        media_type=img_resp.headers.get("content-type", "image/jpeg"),
    )


# ─── Sync & Vincular ───────────────────────────────────────────────────────────

@router.post("/sync/{db_campana_id}")
async def sync_campaign_metrics(
    db_campana_id: int, user: user_dependency, db: db_dependency
):
    """Sincroniza métricas de Google Ads al registro local de la campaña."""
    if user is None:
        raise HTTPException(status_code=401)

    campana = db.query(Campanas).filter(Campanas.id == db_campana_id).first()
    if not campana:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    if not campana.google_ads_id:
        raise HTTPException(status_code=400, detail="Esta campaña no está vinculada a Google Ads")

    cfg = _get_google_config(db)
    if not _is_configured(cfg):
        raise HTTPException(status_code=503, detail="Google Ads no configurado")

    token = _get_access_token(cfg)
    customer_id = _get_customer_id_for_marca(cfg, campana.marca)
    if not customer_id:
        raise HTTPException(
            status_code=400,
            detail=f"No hay customer_id configurado para la marca '{campana.marca}'. Configura el mapa de cuentas en Google Ads.",
        )
    rows = _gaql(
        token,
        cfg["developer_token"],
        customer_id,
        f"""
        SELECT
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.ctr,
            metrics.interactions,
            metrics.conversion_rate
        FROM campaign
        WHERE campaign.id = {campana.google_ads_id}
            AND segments.date DURING THIS_MONTH
        """,
        manager_id=cfg.get("manager_id", ""),
    )

    if not rows:
        return {"updated": False, "message": "No hay datos para este mes en Google Ads"}

    m = rows[0].get("metrics", {})
    campana.alcance = int(m.get("impressions", 0) or 0)
    campana.interacciones = int(m.get("interactions", 0) or 0)
    campana.leads = max(0, int(float(m.get("conversions", 0) or 0)))
    campana.gasto_actual = round((int(m.get("costMicros", 0) or 0)) / 1_000_000, 2)
    campana.ctr = round(float(m.get("ctr", 0) or 0) * 100, 4)
    campana.conversion = round(float(m.get("conversionRate", 0) or 0) * 100, 2)
    db.commit()

    return {
        "updated": True,
        "datos": {
            "alcance": campana.alcance,
            "interacciones": campana.interacciones,
            "leads": campana.leads,
            "gasto_actual": campana.gasto_actual,
            "ctr": campana.ctr,
            "conversion": campana.conversion,
        },
    }


@router.put("/vincular/{db_campana_id}")
async def vincular_campaign(
    db_campana_id: int, payload: dict, user: user_dependency, db: db_dependency
):
    """Vincula o desvincula una campaña local con su ID de Google Ads."""
    _require_admin(user)
    campana = db.query(Campanas).filter(Campanas.id == db_campana_id).first()
    if not campana:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    gads_id = payload.get("google_ads_id")
    campana.google_ads_id = str(gads_id).strip() if gads_id else None
    db.commit()
    return {"success": True, "google_ads_id": campana.google_ads_id}


# ─── Lógica de importación reutilizable (también usada por el auto-sync) ──────

def _importar_todas_las_marcas(db: Session) -> dict:
    """
    Importa/actualiza campañas de Google Ads para todas las marcas configuradas.
    Usa dos queries separadas:
      1. Todas las campañas activas (sin filtro de fecha) → nombre, estado, fechas, presupuesto
      2. Métricas agregadas del mes → impresiones, coste, conversiones, ctr, cpc, cxc
    Esto garantiza que campañas sin actividad este mes igualmente se importan.
    """
    from datetime import date as date_type
    import calendar

    cfg = _get_google_config(db)
    if not _is_configured(cfg):
        return {"error": "Google Ads no configurado"}

    marcas = list(cfg["customer_map"].keys()) if cfg.get("customer_map") else ([""] if cfg.get("customer_id") else [])
    if not marcas:
        return {"error": "Sin cuentas configuradas"}

    try:
        token = _get_access_token(cfg)
    except Exception as e:
        return {"error": str(e)}

    ESTADO_MAP = {"ENABLED": "Activa", "PAUSED": "Pausada", "REMOVED": "Completada"}

    # Rango del mes actual para query de métricas
    hoy = date_type.today()
    mes_inicio = hoy.replace(day=1).isoformat()
    mes_fin = hoy.isoformat()

    resumen = {"creadas": 0, "actualizadas": 0, "marcas": [], "errores": []}

    for marca in marcas:
        customer_id = _get_customer_id_for_marca(cfg, marca if marca else None)
        if not customer_id:
            resumen["errores"].append(f"Sin customer_id para '{marca}'")
            continue

        # ── Query 1: Info de campañas (sin filtro de fecha, no genera filas por día) ──
        try:
            rows_info = _gaql(
                token, cfg["developer_token"], customer_id,
                """
                SELECT
                    campaign.id,
                    campaign.name,
                    campaign.status,
                    campaign.start_date,
                    campaign.end_date,
                    campaign_budget.amount_micros
                FROM campaign
                WHERE campaign.status != 'REMOVED'
                ORDER BY campaign.name
                """,
                manager_id=cfg.get("manager_id", ""),
            )
        except HTTPException as e:
            resumen["errores"].append(f"{marca} (info): {e.detail}")
            continue

        # ── Query 2: Métricas del mes actual (una fila por campaña, sin segments.date) ──
        metricas_por_id: dict = {}
        try:
            rows_metrics = _gaql(
                token, cfg["developer_token"], customer_id,
                f"""
                SELECT
                    campaign.id,
                    metrics.impressions,
                    metrics.clicks,
                    metrics.cost_micros,
                    metrics.conversions,
                    metrics.ctr,
                    metrics.interactions,
                    metrics.cost_per_conversion
                FROM campaign
                WHERE campaign.status != 'REMOVED'
                    AND segments.date BETWEEN '{mes_inicio}' AND '{mes_fin}'
                """,
                manager_id=cfg.get("manager_id", ""),
            )
            # Agregar métricas por campaign.id (puede haber múltiples rows por día → sumar)
            for r in rows_metrics:
                cid = str(r.get("campaign", {}).get("id", ""))
                if not cid:
                    continue
                m = r.get("metrics", {})
                if cid not in metricas_por_id:
                    metricas_por_id[cid] = {
                        "impressions": 0, "clicks": 0, "costMicros": 0,
                        "conversions": 0.0, "interactions": 0,
                        "ctr": 0.0, "costPerConversion": 0.0,
                    }
                metricas_por_id[cid]["impressions"] += int(m.get("impressions", 0) or 0)
                metricas_por_id[cid]["clicks"] += int(m.get("clicks", 0) or 0)
                metricas_por_id[cid]["costMicros"] += int(m.get("costMicros", 0) or 0)
                metricas_por_id[cid]["conversions"] += float(m.get("conversions", 0) or 0)
                metricas_por_id[cid]["interactions"] += int(m.get("interactions", 0) or 0)
                # ctr/costPerConversion → tomar el último (son ratios/promedios, no sumas)
                metricas_por_id[cid]["ctr"] = float(m.get("ctr", 0) or 0)
                metricas_por_id[cid]["costPerConversion"] = float(m.get("costPerConversion", 0) or 0)
        except HTTPException:
            pass  # Si no hay métricas este mes, igual importamos las campañas con 0s

        creadas_marca = 0
        actualizadas_marca = 0

        for row in rows_info:
            c = row.get("campaign", {})
            b = row.get("campaignBudget", {})
            gads_id = str(c.get("id", ""))
            if not gads_id:
                continue

            m = metricas_por_id.get(gads_id, {})

            # ── Mapeo Google Ads → Metrik ──────────────────────────────────────
            # impresiones  → alcance
            # coste        → gasto_actual (inversión)
            # conversiones → leads
            # ctr          → ctr
            # conversion_rate → conversion (%)
            # cost_per_conversion → cxc_porcentaje (costo x conversión)
            # interactions → interacciones
            alcance      = m.get("impressions", 0)
            interacciones= m.get("interactions", 0)
            leads        = max(0, int(m.get("conversions", 0)))
            gasto        = round(m.get("costMicros", 0) / 1_000_000, 2)
            ctr          = round(m.get("ctr", 0) * 100, 4)
            # conversion_rate no existe en v20 → calcular manualmente
            _conv  = float(m.get("conversions", 0) or 0)
            _inter = int(m.get("interactions", 0) or 0)
            tasa_conv = round((_conv / _inter * 100) if _inter > 0 else 0.0, 2)
            cxc          = round(m.get("costPerConversion", 0) / 1_000_000, 2) if m.get("costPerConversion") else 0.0
            presupuesto  = round((int(b.get("amountMicros", 0) or 0)) / 1_000_000, 2)
            estado       = ESTADO_MAP.get(c.get("status", ""), "Activa")

            fecha_inicio = None
            fecha_fin    = None
            try:
                if c.get("startDate"):
                    fecha_inicio = date_type.fromisoformat(c["startDate"])
            except Exception:
                pass
            if fecha_inicio is None:
                fecha_inicio = hoy  # fallback: hoy si Google no devuelve fecha
            try:
                if c.get("endDate") and c["endDate"] != "2037-12-30":
                    fecha_fin = date_type.fromisoformat(c["endDate"])
            except Exception:
                pass

            existente = db.query(Campanas).filter(Campanas.google_ads_id == gads_id).first()
            if existente:
                existente.estado        = estado
                existente.alcance       = alcance
                existente.interacciones = interacciones
                existente.leads         = leads
                existente.gasto_actual  = gasto
                existente.ctr           = ctr
                existente.conversion    = tasa_conv
                existente.cxc_porcentaje = cxc
                if presupuesto:
                    existente.presupuesto = presupuesto
                if fecha_inicio:
                    existente.fecha_inicio = fecha_inicio
                if fecha_fin:
                    existente.fecha_fin = fecha_fin
                actualizadas_marca += 1
            else:
                db.add(Campanas(
                    nombre=c.get("name", f"Campaña {gads_id}"),
                    estado=estado,
                    plataforma="Google Ads",
                    marca=marca,
                    google_ads_id=gads_id,
                    alcance=alcance,
                    interacciones=interacciones,
                    leads=leads,
                    gasto_actual=gasto,
                    presupuesto=presupuesto or 0,
                    ctr=ctr,
                    conversion=tasa_conv,
                    cxc_porcentaje=cxc,
                    fecha_inicio=fecha_inicio,
                    fecha_fin=fecha_fin,
                    auto_objetivo="",
                    creado_por="Google Ads Import",
                ))
                creadas_marca += 1

        db.commit()
        resumen["creadas"]      += creadas_marca
        resumen["actualizadas"] += actualizadas_marca
        resumen["marcas"].append({"marca": marca, "creadas": creadas_marca, "actualizadas": actualizadas_marca})

    return resumen


@router.post("/importar")
async def importar_campanas(payload: dict, user: user_dependency, db: db_dependency):
    """Importa o actualiza campañas de Google Ads en la BD de Metrik."""
    _require_admin(user)
    cfg = _get_google_config(db)
    if not _is_configured(cfg):
        raise HTTPException(status_code=503, detail="Google Ads no configurado")

    marca_solicitada = payload.get("marca", "").strip()
    if marca_solicitada:
        # Solo una marca: restringir el customer_map temporalmente
        original_map = cfg.get("customer_map", {})
        if marca_solicitada not in original_map and not cfg.get("customer_id"):
            raise HTTPException(status_code=400, detail=f"Marca '{marca_solicitada}' no encontrada en la configuración")

    result = _importar_todas_las_marcas(db)
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result

