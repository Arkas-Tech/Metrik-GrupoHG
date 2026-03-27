"""
Meta (Facebook) Ads API integration – credenciales en .env del servidor.
Nunca se exponen al frontend ni se incluyen en el repositorio.

Requiere en .env:
  META_ADS_ACCESS_TOKEN   – Token de usuario del sistema (System User Token)
  META_ADS_APP_ID         – App ID de Meta for Developers
  META_ADS_APP_SECRET     – App Secret de Meta for Developers
  META_ADS_ACCOUNT_MAP    – JSON  {"Marca": "act_123456789", ...}

El access_token debe ser un token de larga duración (60 días) o, idealmente,
un System User Token que no caduca.  Se puede generar desde:
  Meta Business Suite → Configuración → Cuentas → Usuarios del sistema → Generar Token
"""
import json
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from starlette import status
from .auth import get_current_user
from database import SessionLocal
from models import Campanas, SystemSettings
import os
import requests as http_requests

router = APIRouter(prefix="/meta-ads", tags=["meta-ads"])
user_dependency = Annotated[dict, Depends(get_current_user)]

META_GRAPH_VERSION = "v21.0"
META_GRAPH_BASE = f"https://graph.facebook.com/{META_GRAPH_VERSION}"


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]


def _require_admin(user: dict):
    if user is None or user.get("role") not in ["administrador", "developer"]:
        raise HTTPException(status_code=403, detail="Acceso solo para administradores")


# ─── Configuración ──────────────────────────────────────────────────────────────

def _get_meta_config(db: Session) -> dict:
    """Lee credenciales de .env y tokens/account_map de DB o .env."""
    # Access token: DB > .env
    db_token = (
        db.query(SystemSettings)
        .filter(SystemSettings.key == "meta_ads_access_token")
        .first()
    )
    access_token = (db_token.value if db_token else None) or os.getenv("META_ADS_ACCESS_TOKEN")

    # Account map: .env base, DB override
    account_map: dict = {}
    env_map_str = os.getenv("META_ADS_ACCOUNT_MAP", "")
    if env_map_str:
        try:
            account_map = json.loads(env_map_str)
        except Exception:
            pass

    db_map = (
        db.query(SystemSettings)
        .filter(SystemSettings.key == "meta_ads_account_map")
        .first()
    )
    if db_map and db_map.value:
        try:
            account_map.update(json.loads(db_map.value))
        except Exception:
            pass

    return {
        "app_id": os.getenv("META_ADS_APP_ID"),
        "app_secret": os.getenv("META_ADS_APP_SECRET"),
        "access_token": access_token,
        "account_map": account_map,
    }


def _is_configured(cfg: dict) -> bool:
    return bool(cfg.get("access_token") and cfg.get("account_map"))


def _get_account_id_for_marca(cfg: dict, marca: Optional[str]) -> str:
    """Devuelve el ad_account_id de Meta para la marca dada."""
    if marca and cfg.get("account_map") and marca in cfg["account_map"]:
        aid = str(cfg["account_map"][marca])
        return aid if aid.startswith("act_") else f"act_{aid}"
    return ""


def _meta_api(access_token: str, endpoint: str, params: dict | None = None) -> dict:
    """Llamada GET al Graph API de Meta."""
    url = f"{META_GRAPH_BASE}/{endpoint}"
    p = dict(params or {})
    p["access_token"] = access_token
    resp = http_requests.get(url, params=p, timeout=30)
    if not resp.ok:
        error_msg = resp.json().get("error", {}).get("message", resp.text[:300])
        raise HTTPException(status_code=502, detail=f"Meta Ads API error: {error_msg}")
    return resp.json()


# Mapeo de optimization_goal (ad set) → action_type para "Resultados"
_OPT_GOAL_ACTION = {
    "POST_ENGAGEMENT": "post_engagement",
    "CONVERSATIONS": "onsite_conversion.messaging_conversation_started_7d",
    "LEAD_GENERATION": "lead",
    "QUALITY_LEAD": "lead",
    "LINK_CLICKS": "link_click",
    "LANDING_PAGE_VIEWS": "landing_page_view",
    "THRUPLAY": "video_view",
    "TWO_SECOND_CONTINUOUS_VIDEO_VIEWS": "video_view",
    "OFFSITE_CONVERSIONS": "purchase",
    "VALUE": "purchase",
    "REACH": None,  # usar impressions directamente
    "IMPRESSIONS": None,
}


def _get_optimization_goals(token: str, account_id: str) -> dict:
    """Devuelve {campaign_id: optimization_goal} para todas las adsets de una cuenta."""
    goals: dict = {}
    try:
        data = _meta_api(token, f"{account_id}/adsets", {
            "fields": "campaign_id,optimization_goal",
            "limit": "500",
        })
        for a in data.get("data", []):
            cid = a.get("campaign_id")
            if cid and cid not in goals:
                goals[cid] = a.get("optimization_goal", "")
    except Exception:
        pass
    return goals


def _extract_resultados(actions: list, opt_goal: str) -> float:
    """Extrae el valor de 'Resultados' correcto según el optimization_goal de la campaña."""
    target_action = _OPT_GOAL_ACTION.get(opt_goal)
    if target_action is None:
        # REACH/IMPRESSIONS → no hay acción, devolvemos 0 (se usa impressions aparte)
        return 0.0

    for action in actions:
        if action.get("action_type") == target_action:
            return float(action.get("value", 0) or 0)

    # Fallback: buscar lead, purchase, complete_registration
    fallback_types = ("lead", "onsite_conversion.lead_grouped", "complete_registration", "purchase")
    for action in actions:
        if action.get("action_type") in fallback_types:
            return float(action.get("value", 0) or 0)

    return 0.0


# ─── Status ─────────────────────────────────────────────────────────────────────

@router.get("/status")
async def get_status(user: user_dependency, db: db_dependency):
    _require_admin(user)
    cfg = _get_meta_config(db)
    return {
        "configured": _is_configured(cfg),
        "has_access_token": bool(cfg.get("access_token")),
        "has_app_credentials": bool(cfg.get("app_id") and cfg.get("app_secret")),
        "account_count": len(cfg.get("account_map", {})),
        "account_map": cfg.get("account_map", {}),
    }


# ─── Token exchange ─────────────────────────────────────────────────────────────

@router.post("/token/exchange")
async def exchange_short_token(payload: dict, user: user_dependency, db: db_dependency):
    """Canjea un token de corta duración por uno de larga duración y lo guarda."""
    _require_admin(user)
    short_token = payload.get("access_token", "").strip()
    if not short_token:
        raise HTTPException(status_code=400, detail="Se requiere el access_token corto")

    app_id = os.getenv("META_ADS_APP_ID")
    app_secret = os.getenv("META_ADS_APP_SECRET")
    if not app_id or not app_secret:
        raise HTTPException(status_code=503, detail="Faltan META_ADS_APP_ID o APP_SECRET en .env")

    resp = http_requests.get(
        f"{META_GRAPH_BASE}/oauth/access_token",
        params={
            "grant_type": "fb_exchange_token",
            "client_id": app_id,
            "client_secret": app_secret,
            "fb_exchange_token": short_token,
        },
        timeout=15,
    )
    if not resp.ok:
        err = resp.json().get("error", {}).get("message", resp.text[:200])
        raise HTTPException(status_code=400, detail=f"Error al extender token: {err}")

    long_token = resp.json().get("access_token")
    if not long_token:
        raise HTTPException(status_code=400, detail="Meta no devolvió el token largo")

    existing = (
        db.query(SystemSettings)
        .filter(SystemSettings.key == "meta_ads_access_token")
        .first()
    )
    if existing:
        existing.value = long_token
    else:
        db.add(SystemSettings(key="meta_ads_access_token", value=long_token))
    db.commit()

    return {"success": True, "message": "Token de Meta Ads guardado correctamente"}


@router.post("/token/save")
async def save_token(payload: dict, user: user_dependency, db: db_dependency):
    """Guarda directamente un System User Token (no caduca)."""
    _require_admin(user)
    token = payload.get("access_token", "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="Se requiere access_token")

    existing = (
        db.query(SystemSettings)
        .filter(SystemSettings.key == "meta_ads_access_token")
        .first()
    )
    if existing:
        existing.value = token
    else:
        db.add(SystemSettings(key="meta_ads_access_token", value=token))
    db.commit()
    return {"success": True}


@router.delete("/token/disconnect")
async def disconnect_meta_ads(user: user_dependency, db: db_dependency):
    _require_admin(user)
    db.query(SystemSettings).filter(SystemSettings.key == "meta_ads_access_token").delete()
    db.commit()
    return {"success": True}


# ─── Account map ─────────────────────────────────────────────────────────────────

@router.get("/account-map")
async def get_account_map(user: user_dependency, db: db_dependency):
    _require_admin(user)
    row = db.query(SystemSettings).filter(SystemSettings.key == "meta_ads_account_map").first()
    if row and row.value:
        try:
            return json.loads(row.value)
        except Exception:
            pass
    return {}


@router.put("/account-map")
async def set_account_map(payload: dict, user: user_dependency, db: db_dependency):
    """Guarda mapa marca → ad_account_id.  Ej: {"GWM Chihuahua": "act_123456"}"""
    _require_admin(user)
    cleaned = {}
    for marca, aid in payload.items():
        if not marca or not str(aid).strip():
            continue
        val = str(aid).strip()
        cleaned[str(marca).strip()] = val if val.startswith("act_") else f"act_{val}"

    row = db.query(SystemSettings).filter(SystemSettings.key == "meta_ads_account_map").first()
    if row:
        row.value = json.dumps(cleaned, ensure_ascii=False)
    else:
        db.add(SystemSettings(key="meta_ads_account_map", value=json.dumps(cleaned, ensure_ascii=False)))
    db.commit()
    return {"success": True, "cuentas_guardadas": len(cleaned), "mapa": cleaned}


# ─── Campañas de Meta Ads ──────────────────────────────────────────────────────

@router.get("/campanas")
async def list_meta_campaigns(
    user: user_dependency,
    db: db_dependency,
    marca: Optional[str] = Query(None),
):
    """Lista campañas de Meta Ads con insights."""
    _require_admin(user)
    cfg = _get_meta_config(db)
    if not _is_configured(cfg):
        raise HTTPException(status_code=503, detail="Meta Ads no configurado")

    account_id = _get_account_id_for_marca(cfg, marca)
    if not account_id:
        if cfg.get("account_map"):
            raise HTTPException(
                status_code=400,
                detail=f"Especifica ?marca= con una de: {list(cfg['account_map'].keys())}",
            )
        raise HTTPException(status_code=503, detail="No hay account_id configurado")

    token = cfg["access_token"]

    # Obtener campañas con insights all-time
    data = _meta_api(token, f"{account_id}/campaigns", {
        "fields": "id,name,status,start_time,stop_time,daily_budget,lifetime_budget",
        "filtering": json.dumps([{"field": "effective_status", "operator": "NOT_IN", "value": ["DELETED", "ARCHIVED"]}]),
        "limit": "500",
    })

    results = []
    for c in data.get("data", []):
        results.append({
            "id": c.get("id"),
            "nombre": c.get("name"),
            "estado": c.get("status"),
            "fecha_inicio": c.get("start_time", "")[:10] if c.get("start_time") else None,
            "fecha_fin": c.get("stop_time", "")[:10] if c.get("stop_time") else None,
            "presupuesto_diario": round(float(c.get("daily_budget", 0) or 0) / 100, 2),
            "presupuesto_total": round(float(c.get("lifetime_budget", 0) or 0) / 100, 2),
        })
    return results


# ─── Anuncios de una campaña Meta Ads ────────────────────────────────────────

@router.get("/campanas/{campaign_id}/anuncios")
async def list_meta_campaign_ads(
    campaign_id: str,
    user: user_dependency,
    db: db_dependency,
    marca: Optional[str] = Query(None),
):
    """Retorna los anuncios de una campaña con imagen de alta calidad cuando es posible."""
    if user is None:
        raise HTTPException(status_code=401)
    cfg = _get_meta_config(db)
    if not _is_configured(cfg):
        raise HTTPException(status_code=503, detail="Meta Ads no configurado")

    token = cfg["access_token"]
    account_id = _get_account_id_for_marca(cfg, marca) if marca else ""

    data = _meta_api(token, f"{campaign_id}/ads", {
        "fields": "id,name,effective_status,creative{id,thumbnail_url,image_url,image_hash,body,title,call_to_action_type,object_story_spec}",
        "limit": "100",
    })

    ads = data.get("data", [])

    # Batch-fetch full-res image URLs via adimages (one call for all hashes)
    hash_to_full_url: dict = {}
    if account_id:
        hashes = [
            ad["creative"]["image_hash"]
            for ad in ads
            if ad.get("creative", {}).get("image_hash")
        ]
        if hashes:
            try:
                imgs = _meta_api(token, f"{account_id}/adimages", {
                    "hashes": json.dumps(hashes),
                    "fields": "hash,permalink_url,url",
                    "limit": "500",
                })
                for img in imgs.get("data", []):
                    h = img.get("hash")
                    if h:
                        # permalink_url is the original full-resolution upload
                        best = img.get("permalink_url") or img.get("url", "")
                        if best:
                            hash_to_full_url[h] = best
            except Exception:
                pass

    results = []
    for ad in ads:
        creative = ad.get("creative") or {}
        image_hash = creative.get("image_hash", "")
        full_url = hash_to_full_url.get(image_hash, "") if image_hash else ""

        # Fallback: picture from object_story_spec (link/photo ads)
        if not full_url:
            oss = creative.get("object_story_spec") or {}
            full_url = (
                (oss.get("link_data") or {}).get("picture")
                or (oss.get("photo_data") or {}).get("url")
                or creative.get("image_url")
                or ""
            )

        results.append({
            "id": str(ad.get("id", "")),
            "nombre": ad.get("name", ""),
            "estado": ad.get("effective_status", ""),
            "full_image_url": full_url,
            "image_url": creative.get("image_url", ""),
            "thumbnail_url": creative.get("thumbnail_url", ""),
            "titulo": creative.get("title", ""),
            "cuerpo": creative.get("body", ""),
        })
    return results


# ─── Métricas por período ──────────────────────────────────────────────────────

@router.get("/metrics")
async def get_period_metrics(
    user: user_dependency,
    db: db_dependency,
    year: int = Query(...),
    month: int = Query(...),
):
    """Métricas de Meta Ads filtradas por mes/año para todas las marcas."""
    if user is None:
        raise HTTPException(status_code=401)

    import calendar

    cfg = _get_meta_config(db)
    if not _is_configured(cfg):
        return {}

    marcas = list(cfg["account_map"].keys())
    if not marcas:
        return {}

    token = cfg["access_token"]

    _, last_day = calendar.monthrange(year, month)
    start = f"{year}-{month:02d}-01"
    end = f"{year}-{month:02d}-{last_day:02d}"

    result: dict = {}

    for marca in marcas:
        account_id = _get_account_id_for_marca(cfg, marca)
        if not account_id:
            continue
        try:
            # Obtener optimization_goal por campaña (una sola llamada por cuenta)
            opt_goals = _get_optimization_goals(token, account_id)

            # Una sola llamada para todas las campañas de la cuenta en el período
            insights_data = _meta_api(token, f"{account_id}/insights", {
                "fields": "campaign_id,impressions,clicks,spend,actions,ctr,inline_link_clicks,cost_per_inline_link_click",
                "level": "campaign",
                "time_range": json.dumps({"since": start, "until": end}),
                "limit": "500",
            })
            for row in insights_data.get("data", []):
                cid = row.get("campaign_id")
                if not cid:
                    continue

                impressions = int(row.get("impressions", 0) or 0)
                clicks = int(row.get("clicks", 0) or 0)
                spend = float(row.get("spend", 0) or 0)
                ctr = float(row.get("ctr", 0) or 0)

                # Resultados según el objetivo de optimización de la campaña
                actions = row.get("actions", [])
                og = opt_goals.get(cid, "")
                conversions = _extract_resultados(actions, og)

                # Interactions = all clicks
                interactions = int(row.get("clicks", 0) or 0)

                # CxC (cost per inline link click)
                cxc = float(row.get("cost_per_inline_link_click", 0) or 0)

                result[cid] = {
                    "alcance": impressions,
                    "interacciones": interactions,
                    "leads": max(0, int(conversions)),
                    "gasto_actual": round(spend, 2),
                    "ctr": round(ctr, 4),
                    "conversion": round((conversions / interactions * 100) if interactions > 0 else 0, 2),
                    "cxc_porcentaje": round(cxc, 2),
                }
        except Exception:
            continue

    return result


# ─── Sync individual ────────────────────────────────────────────────────────────

@router.post("/sync/{db_campana_id}")
async def sync_campaign_metrics(
    db_campana_id: int, user: user_dependency, db: db_dependency
):
    """Sincroniza métricas de Meta Ads al registro local."""
    if user is None:
        raise HTTPException(status_code=401)

    campana = db.query(Campanas).filter(Campanas.id == db_campana_id).first()
    if not campana:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    if not campana.meta_ads_id:
        raise HTTPException(status_code=400, detail="Esta campaña no está vinculada a Meta Ads")

    cfg = _get_meta_config(db)
    if not _is_configured(cfg):
        raise HTTPException(status_code=503, detail="Meta Ads no configurado")

    token = cfg["access_token"]

    try:
        insights = _meta_api(token, f"{campana.meta_ads_id}/insights", {
            "fields": "impressions,clicks,spend,actions,ctr,inline_link_clicks,cost_per_inline_link_click",
            "date_preset": "maximum",
        })
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    rows = insights.get("data", [])
    if not rows:
        return {"updated": False, "message": "No hay datos en Meta Ads para esta campaña"}

    row = rows[0]
    impressions = int(row.get("impressions", 0) or 0)
    clicks = int(row.get("clicks", 0) or 0)
    spend = float(row.get("spend", 0) or 0)
    ctr = float(row.get("ctr", 0) or 0)

    # Obtener optimization_goal para esta campaña
    try:
        adsets = _meta_api(token, f"{campana.meta_ads_id}/adsets", {
            "fields": "optimization_goal",
            "limit": "1",
        })
        og = adsets.get("data", [{}])[0].get("optimization_goal", "") if adsets.get("data") else ""
    except Exception:
        og = ""

    actions = row.get("actions", [])
    conversions = _extract_resultados(actions, og)

    interactions = int(row.get("clicks", 0) or 0)

    cxc = float(row.get("cost_per_inline_link_click", 0) or 0)

    campana.alcance = impressions
    campana.interacciones = interactions
    campana.leads = max(0, int(conversions))
    campana.gasto_actual = round(spend, 2)
    campana.ctr = round(ctr, 4)
    campana.conversion = round((conversions / interactions * 100) if interactions > 0 else 0, 2)
    campana.cxc_porcentaje = round(cxc, 2)
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


# ─── Vincular ───────────────────────────────────────────────────────────────────

@router.put("/vincular/{db_campana_id}")
async def vincular_campaign(
    db_campana_id: int, payload: dict, user: user_dependency, db: db_dependency
):
    _require_admin(user)
    campana = db.query(Campanas).filter(Campanas.id == db_campana_id).first()
    if not campana:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    meta_id = payload.get("meta_ads_id")
    campana.meta_ads_id = str(meta_id).strip() if meta_id else None
    db.commit()
    return {"success": True, "meta_ads_id": campana.meta_ads_id}


# ─── Importación de todas las marcas (también lo usa el auto-sync) ─────────────

def _importar_todas_las_marcas(db: Session) -> dict:
    """Importa/actualiza campañas de Meta Ads para todas las marcas configuradas."""
    from datetime import date as date_type

    cfg = _get_meta_config(db)
    if not _is_configured(cfg):
        return {"error": "Meta Ads no configurado"}

    marcas = list(cfg["account_map"].keys())
    if not marcas:
        return {"error": "Sin cuentas configuradas"}

    token = cfg["access_token"]

    ESTADO_MAP = {"ACTIVE": "Activa", "PAUSED": "Pausada"}
    hoy = date_type.today()

    resumen = {"creadas": 0, "actualizadas": 0, "marcas": [], "errores": []}

    for marca in marcas:
        account_id = _get_account_id_for_marca(cfg, marca)
        if not account_id:
            resumen["errores"].append(f"Sin account_id para '{marca}'")
            continue

        # ── Obtener lista de campañas ──
        try:
            data = _meta_api(token, f"{account_id}/campaigns", {
                "fields": "id,name,status,start_time,stop_time,daily_budget,lifetime_budget",
                "filtering": json.dumps([{"field": "effective_status", "operator": "NOT_IN", "value": ["DELETED", "ARCHIVED"]}]),
                "limit": "500",
            })
        except HTTPException as e:
            resumen["errores"].append(f"{marca} (campaigns): {e.detail}")
            continue

        campaigns = data.get("data", [])

        # ── Obtener optimization_goal por campaña ──
        opt_goals = _get_optimization_goals(token, account_id)

        # ── Obtener métricas all-time por campaña ──
        metricas_por_id: dict = {}
        try:
            insights_data = _meta_api(token, f"{account_id}/insights", {
                "fields": "campaign_id,impressions,clicks,spend,actions,ctr,inline_link_clicks,cost_per_inline_link_click",
                "level": "campaign",
                "date_preset": "maximum",
                "limit": "500",
            })
            for row in insights_data.get("data", []):
                cid = row.get("campaign_id")
                if not cid:
                    continue
                impressions = int(row.get("impressions", 0) or 0)
                clicks = int(row.get("clicks", 0) or 0)
                spend = float(row.get("spend", 0) or 0)
                ctr_val = float(row.get("ctr", 0) or 0)

                actions = row.get("actions", [])
                og = opt_goals.get(cid, "")
                conversions = _extract_resultados(actions, og)

                interactions = int(row.get("clicks", 0) or 0)

                cxc = float(row.get("cost_per_inline_link_click", 0) or 0)

                metricas_por_id[cid] = {
                    "impressions": impressions,
                    "interactions": interactions,
                    "conversions": conversions,
                    "spend": spend,
                    "ctr": ctr_val,
                    "cxc": cxc,
                }
        except Exception:
            pass  # Si falla insights, importamos campañas con 0s

        creadas_marca = 0
        actualizadas_marca = 0

        for c in campaigns:
            meta_id = c.get("id")
            if not meta_id:
                continue

            m = metricas_por_id.get(meta_id, {})

            alcance = m.get("impressions", 0)
            interacciones = m.get("interactions", 0)
            leads = max(0, int(m.get("conversions", 0)))
            gasto = round(m.get("spend", 0), 2)
            ctr_val = round(m.get("ctr", 0), 4)
            _conv = float(m.get("conversions", 0) or 0)
            _inter = int(m.get("interactions", 0) or 0)
            tasa_conv = round((_conv / _inter * 100) if _inter > 0 else 0.0, 2)
            cxc = round(m.get("cxc", 0), 2)

            # Presupuesto: daily_budget (centavos) > lifetime_budget / 30
            daily_budget = float(c.get("daily_budget", 0) or 0) / 100
            lifetime_budget = float(c.get("lifetime_budget", 0) or 0) / 100
            presupuesto = round(daily_budget if daily_budget > 0 else lifetime_budget / 30, 2)

            estado = ESTADO_MAP.get(c.get("status", ""), "Activa")

            fecha_inicio = None
            fecha_fin = None
            try:
                if c.get("start_time"):
                    fecha_inicio = date_type.fromisoformat(c["start_time"][:10])
            except Exception:
                pass
            if fecha_inicio is None:
                fecha_inicio = hoy
            try:
                if c.get("stop_time"):
                    fecha_fin = date_type.fromisoformat(c["stop_time"][:10])
            except Exception:
                pass

            existente = db.query(Campanas).filter(Campanas.meta_ads_id == meta_id).first()
            if existente:
                existente.estado = estado
                existente.alcance = alcance
                existente.interacciones = interacciones
                existente.leads = leads
                existente.gasto_actual = gasto
                existente.ctr = ctr_val
                existente.conversion = tasa_conv
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
                    nombre=c.get("name", f"Campaña {meta_id}"),
                    estado=estado,
                    plataforma="Meta Ads",
                    marca=marca,
                    meta_ads_id=meta_id,
                    alcance=alcance,
                    interacciones=interacciones,
                    leads=leads,
                    gasto_actual=gasto,
                    presupuesto=presupuesto or 0,
                    ctr=ctr_val,
                    conversion=tasa_conv,
                    cxc_porcentaje=cxc,
                    fecha_inicio=fecha_inicio,
                    fecha_fin=fecha_fin,
                    auto_objetivo="",
                    creado_por="Meta Ads Import",
                ))
                creadas_marca += 1

        db.commit()
        resumen["creadas"] += creadas_marca
        resumen["actualizadas"] += actualizadas_marca
        resumen["marcas"].append({"marca": marca, "creadas": creadas_marca, "actualizadas": actualizadas_marca})

    return resumen


@router.post("/importar")
async def importar_campanas(payload: dict, user: user_dependency, db: db_dependency):
    """Importa o actualiza campañas de Meta Ads en la BD de Metrik."""
    _require_admin(user)
    cfg = _get_meta_config(db)
    if not _is_configured(cfg):
        raise HTTPException(status_code=503, detail="Meta Ads no configurado")

    result = _importar_todas_las_marcas(db)
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return result
