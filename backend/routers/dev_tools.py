from datetime import datetime, timedelta
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from database import SessionLocal
from sqlalchemy.orm import Session
from sqlalchemy import func, text, desc, cast, String
from models import (
    Users, Marcas, Facturas, Proyecciones, Campanas, Embajadores,
    PresenciaTradicional, PresupuestoAnual, PresupuestoMensual,
    Eventos, Proveedores, RequestLog, ActivityLog, FeatureFlag,
    SystemSettings
)
from .auth import get_current_user
from pydantic import BaseModel
import subprocess
import os
import json
import platform
import traceback

router = APIRouter(prefix='/dev', tags=['dev-tools'])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]


def _require_developer(user: dict):
    if user is None or user.get('role') != 'developer':
        raise HTTPException(status_code=403, detail='Acceso solo para developers')


# ============================================
# 1. PANEL DE ESTADO DEL SISTEMA
# ============================================

@router.get("/system-status")
async def system_status(user: user_dependency, db: db_dependency):
    _require_developer(user)

    # PM2 Info
    pm2_info = []
    try:
        result = subprocess.run(
            ['pm2', 'jlist'], capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            processes = json.loads(result.stdout)
            pm2_info = [{
                'name': p.get('name', 'N/A'),
                'pid': p.get('pid', 0),
                'status': p.get('pm2_env', {}).get('status', 'unknown'),
                'uptime': p.get('pm2_env', {}).get('pm_uptime', 0),
                'restarts': p.get('pm2_env', {}).get('restart_time', 0),
                'memory': p.get('monit', {}).get('memory', 0),
                'cpu': p.get('monit', {}).get('cpu', 0),
            } for p in processes]
    except Exception as e:
        pm2_info = [{'error': str(e)}]

    # DB Stats
    table_counts = {}
    tables = [
        'users', 'marcas', 'eventos', 'facturas', 'proyecciones',
        'campanas', 'embajadores', 'presencia_tradicional',
        'presupuesto_anual', 'presupuesto_mensual', 'proveedores',
        'request_logs', 'activity_logs', 'feature_flags',
        'conciliacion_bdc', 'diagramas_conversion'
    ]
    for table_name in tables:
        try:
            result = db.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            table_counts[table_name] = result.scalar()
        except Exception:
            table_counts[table_name] = -1

    db_size = 'N/A'
    active_connections = -1
    try:
        result = db.execute(text("SELECT pg_size_pretty(pg_database_size(current_database()))"))
        db_size = result.scalar()
    except Exception:
        pass
    try:
        result = db.execute(text("SELECT count(*) FROM pg_stat_activity"))
        active_connections = result.scalar()
    except Exception:
        pass

    # Git info
    git_info = {}
    try:
        commit = subprocess.run(
            ['git', 'rev-parse', '--short', 'HEAD'],
            capture_output=True, text=True, timeout=5
        )
        branch = subprocess.run(
            ['git', 'branch', '--show-current'],
            capture_output=True, text=True, timeout=5
        )
        last_commit = subprocess.run(
            ['git', 'log', '-1', '--format=%s (%cr)'],
            capture_output=True, text=True, timeout=5
        )
        git_info = {
            'commit': commit.stdout.strip(),
            'branch': branch.stdout.strip(),
            'last_commit': last_commit.stdout.strip(),
        }
    except Exception as e:
        git_info = {'error': str(e)}

    # System info
    system_info = {
        'platform': platform.platform(),
        'python_version': platform.python_version(),
        'hostname': platform.node(),
    }

    # Disk usage
    disk_info = {}
    try:
        result = subprocess.run(
            ['df', '-h', '/'],
            capture_output=True, text=True, timeout=5
        )
        lines = result.stdout.strip().split('\n')
        if len(lines) >= 2:
            parts = lines[1].split()
            disk_info = {
                'total': parts[1] if len(parts) > 1 else 'N/A',
                'used': parts[2] if len(parts) > 2 else 'N/A',
                'available': parts[3] if len(parts) > 3 else 'N/A',
                'use_percent': parts[4] if len(parts) > 4 else 'N/A',
            }
    except Exception:
        pass

    return {
        'pm2': pm2_info,
        'database': {
            'table_counts': table_counts,
            'db_size': db_size,
            'active_connections': active_connections,
        },
        'git': git_info,
        'system': system_info,
        'disk': disk_info,
    }


# ============================================
# 2. MONITOR DE ERRORES 500
# ============================================

@router.get("/error-logs")
async def error_logs(
    user: user_dependency,
    db: db_dependency,
    limit: int = Query(50, le=500),
    status_min: int = Query(500, ge=400)
):
    _require_developer(user)

    logs = db.query(RequestLog).filter(
        RequestLog.status_code >= status_min
    ).order_by(desc(RequestLog.created_at)).limit(limit).all()

    return [{
        'id': log.id,
        'method': log.method,
        'path': log.path,
        'status_code': log.status_code,
        'response_time_ms': log.response_time_ms,
        'user_id': log.user_id,
        'user_role': log.user_role,
        'ip_address': log.ip_address,
        'error_detail': log.error_detail,
        'created_at': log.created_at.isoformat() if log.created_at else None,
    } for log in logs]


# ============================================
# 3. DIAGNÓSTICO DE USUARIOS
# ============================================

@router.get("/users-diagnostic")
async def users_diagnostic(user: user_dependency, db: db_dependency):
    _require_developer(user)

    users = db.query(Users).all()
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    result = []
    for u in users:
        # Request count today
        req_count = db.query(func.count(RequestLog.id)).filter(
            RequestLog.user_id == u.id,
            RequestLog.created_at >= today_start
        ).scalar() or 0

        # Last request
        last_req = db.query(RequestLog).filter(
            RequestLog.user_id == u.id
        ).order_by(desc(RequestLog.created_at)).first()

        # Error count today
        err_count = db.query(func.count(RequestLog.id)).filter(
            RequestLog.user_id == u.id,
            RequestLog.status_code >= 400,
            RequestLog.created_at >= today_start
        ).scalar() or 0

        # Marcas assigned
        marcas_count = db.query(func.count(Marcas.id)).filter(
            Marcas.user_id == u.id
        ).scalar() or 0

        result.append({
            'id': u.id,
            'username': u.username,
            'full_name': u.full_name,
            'email': u.email,
            'role': u.role,
            'requests_today': req_count,
            'errors_today': err_count,
            'last_activity': last_req.created_at.isoformat() if last_req and last_req.created_at else None,
            'marcas_count': marcas_count,
        })

    return result


# ============================================
# 4. PERFORMANCE DE ENDPOINTS
# ============================================

@router.get("/endpoint-stats")
async def endpoint_stats(
    user: user_dependency,
    db: db_dependency,
    hours: int = Query(24, le=168)
):
    _require_developer(user)

    since = datetime.utcnow() - timedelta(hours=hours)

    # Slowest endpoints (avg response time)
    slowest = db.query(
        RequestLog.path,
        RequestLog.method,
        func.avg(RequestLog.response_time_ms).label('avg_time'),
        func.max(RequestLog.response_time_ms).label('max_time'),
        func.min(RequestLog.response_time_ms).label('min_time'),
        func.count(RequestLog.id).label('count'),
    ).filter(
        RequestLog.created_at >= since
    ).group_by(
        RequestLog.path, RequestLog.method
    ).order_by(
        desc(func.avg(RequestLog.response_time_ms))
    ).limit(20).all()

    # Most errors
    error_endpoints = db.query(
        RequestLog.path,
        RequestLog.method,
        func.count(RequestLog.id).label('error_count'),
    ).filter(
        RequestLog.created_at >= since,
        RequestLog.status_code >= 400,
    ).group_by(
        RequestLog.path, RequestLog.method
    ).order_by(
        desc(func.count(RequestLog.id))
    ).limit(20).all()

    # Most called
    most_called = db.query(
        RequestLog.path,
        RequestLog.method,
        func.count(RequestLog.id).label('count'),
        func.avg(RequestLog.response_time_ms).label('avg_time'),
    ).filter(
        RequestLog.created_at >= since
    ).group_by(
        RequestLog.path, RequestLog.method
    ).order_by(
        desc(func.count(RequestLog.id))
    ).limit(20).all()

    # Overall stats
    total_requests = db.query(func.count(RequestLog.id)).filter(
        RequestLog.created_at >= since
    ).scalar() or 0
    total_errors = db.query(func.count(RequestLog.id)).filter(
        RequestLog.created_at >= since,
        RequestLog.status_code >= 400
    ).scalar() or 0
    avg_response = db.query(func.avg(RequestLog.response_time_ms)).filter(
        RequestLog.created_at >= since
    ).scalar() or 0

    return {
        'period_hours': hours,
        'total_requests': total_requests,
        'total_errors': total_errors,
        'avg_response_ms': round(float(avg_response), 2),
        'error_rate': round(total_errors / max(total_requests, 1) * 100, 2),
        'slowest': [{
            'path': s.path,
            'method': s.method,
            'avg_time': round(float(s.avg_time), 2),
            'max_time': round(float(s.max_time), 2),
            'min_time': round(float(s.min_time), 2),
            'count': s.count,
        } for s in slowest],
        'most_errors': [{
            'path': e.path,
            'method': e.method,
            'error_count': e.error_count,
        } for e in error_endpoints],
        'most_called': [{
            'path': m.path,
            'method': m.method,
            'count': m.count,
            'avg_time': round(float(m.avg_time), 2),
        } for m in most_called],
    }


# ============================================
# 5. LOGS DE ACTIVIDAD RECIENTE
# ============================================

@router.get("/activity-log")
async def get_activity_log(
    user: user_dependency,
    db: db_dependency,
    limit: int = Query(100, le=500),
    entity_type: Optional[str] = None
):
    _require_developer(user)

    query = db.query(ActivityLog).order_by(desc(ActivityLog.created_at))
    if entity_type:
        query = query.filter(ActivityLog.entity_type == entity_type)

    logs = query.limit(limit).all()

    return [{
        'id': log.id,
        'user_id': log.user_id,
        'user_name': log.user_name,
        'action': log.action,
        'entity_type': log.entity_type,
        'entity_id': log.entity_id,
        'details': log.details,
        'created_at': log.created_at.isoformat() if log.created_at else None,
    } for log in logs]


# ============================================
# 6. RE-SINCRONIZACIÓN
# ============================================

@router.post("/sync/{service}")
async def trigger_sync(
    service: str,
    user: user_dependency,
    db: db_dependency,
):
    _require_developer(user)

    if service not in ['google_ads', 'meta_ads', 'all']:
        raise HTTPException(status_code=400, detail=f'Servicio no válido: {service}')

    results = {}

    if service in ['google_ads', 'all']:
        try:
            # Check Google Ads config
            config = db.query(SystemSettings).filter(
                SystemSettings.key == 'google_ads_config'
            ).first()
            results['google_ads'] = {
                'status': 'configured' if config else 'not_configured',
                'config_exists': config is not None,
                'message': 'Google Ads configurado' if config else 'Google Ads no configurado en SystemSettings',
            }
        except Exception as e:
            results['google_ads'] = {'status': 'error', 'message': str(e)}

    if service in ['meta_ads', 'all']:
        try:
            config = db.query(SystemSettings).filter(
                SystemSettings.key == 'meta_ads_config'
            ).first()
            results['meta_ads'] = {
                'status': 'configured' if config else 'not_configured',
                'config_exists': config is not None,
                'message': 'Meta Ads configurado' if config else 'Meta Ads no configurado en SystemSettings',
            }
        except Exception as e:
            results['meta_ads'] = {'status': 'error', 'message': str(e)}

    # Log activity
    try:
        activity = ActivityLog(
            user_id=user.get('id'),
            user_name=user.get('username'),
            action='sync_triggered',
            entity_type='sync',
            details=json.dumps({'service': service, 'results': results}),
        )
        db.add(activity)
        db.commit()
    except Exception:
        db.rollback()

    return results


# ============================================
# 7. VALIDADOR DE DATOS
# ============================================

@router.get("/data-health")
async def data_health(user: user_dependency, db: db_dependency):
    _require_developer(user)

    issues = []
    stats = {}

    # 1. Facturas sin marca
    try:
        orphan_facturas = db.query(func.count(Facturas.id)).filter(
            (Facturas.marca == None) | (Facturas.marca == '')
        ).scalar() or 0
        total_facturas = db.query(func.count(Facturas.id)).scalar() or 0
        stats['facturas'] = {'total': total_facturas, 'sin_marca': orphan_facturas}
        if orphan_facturas > 0:
            issues.append({
                'severity': 'warning',
                'entity': 'facturas',
                'message': f'{orphan_facturas} facturas sin marca asignada',
                'count': orphan_facturas,
            })
    except Exception as e:
        issues.append({'severity': 'error', 'entity': 'facturas', 'message': f'Error verificando facturas: {str(e)}'})

    # 2. Eventos sin fechas
    try:
        eventos_sin_fecha = db.query(func.count(Eventos.id)).filter(
            (Eventos.fecha_inicio == None) | (Eventos.fecha_fin == None)
        ).scalar() or 0
        total_eventos = db.query(func.count(Eventos.id)).scalar() or 0
        stats['eventos'] = {'total': total_eventos, 'sin_fecha': eventos_sin_fecha}
        if eventos_sin_fecha > 0:
            issues.append({
                'severity': 'warning',
                'entity': 'eventos',
                'message': f'{eventos_sin_fecha} eventos sin fecha inicio/fin',
                'count': eventos_sin_fecha,
            })
    except Exception as e:
        issues.append({'severity': 'error', 'entity': 'eventos', 'message': f'Error verificando eventos: {str(e)}'})

    # 3. Presencias sin datos
    try:
        total_presencias = db.query(func.count(PresenciaTradicional.id)).scalar() or 0
        presencias_sin_marca = db.query(func.count(PresenciaTradicional.id)).filter(
            (PresenciaTradicional.marca == None) | (PresenciaTradicional.marca == '')
        ).scalar() or 0
        stats['presencia_tradicional'] = {'total': total_presencias, 'sin_marca': presencias_sin_marca}
        if presencias_sin_marca > 0:
            issues.append({
                'severity': 'warning',
                'entity': 'presencia_tradicional',
                'message': f'{presencias_sin_marca} presencias sin marca',
                'count': presencias_sin_marca,
            })
    except Exception as e:
        issues.append({'severity': 'error', 'entity': 'presencia_tradicional', 'message': str(e)})

    # 4. Campañas sin presupuesto
    try:
        total_campanas = db.query(func.count(Campanas.id)).scalar() or 0
        campanas_sin_presupuesto = db.query(func.count(Campanas.id)).filter(
            (Campanas.presupuesto == None) | (Campanas.presupuesto == 0)
        ).scalar() or 0
        stats['campanas'] = {'total': total_campanas, 'sin_presupuesto': campanas_sin_presupuesto}
        if campanas_sin_presupuesto > 0:
            issues.append({
                'severity': 'info',
                'entity': 'campanas',
                'message': f'{campanas_sin_presupuesto} campañas sin presupuesto asignado',
                'count': campanas_sin_presupuesto,
            })
    except Exception as e:
        issues.append({'severity': 'error', 'entity': 'campanas', 'message': str(e)})

    # 5. Usuarios sin email
    try:
        total_users = db.query(func.count(Users.id)).scalar() or 0
        users_sin_email = db.query(func.count(Users.id)).filter(
            (Users.email == None) | (Users.email == '')
        ).scalar() or 0
        stats['users'] = {'total': total_users, 'sin_email': users_sin_email}
        if users_sin_email > 0:
            issues.append({
                'severity': 'warning',
                'entity': 'users',
                'message': f'{users_sin_email} usuarios sin email',
                'count': users_sin_email,
            })
    except Exception as e:
        issues.append({'severity': 'error', 'entity': 'users', 'message': str(e)})

    # 6. Proyecciones sin mes/año
    try:
        total_proy = db.query(func.count(Proyecciones.id)).scalar() or 0
        stats['proyecciones'] = {'total': total_proy}
    except Exception as e:
        issues.append({'severity': 'error', 'entity': 'proyecciones', 'message': str(e)})

    # 7. Embajadores sin marca
    try:
        total_emb = db.query(func.count(Embajadores.id)).scalar() or 0
        emb_sin_marca = db.query(func.count(Embajadores.id)).filter(
            (Embajadores.marca == None) | (Embajadores.marca == '')
        ).scalar() or 0
        stats['embajadores'] = {'total': total_emb, 'sin_marca': emb_sin_marca}
        if emb_sin_marca > 0:
            issues.append({
                'severity': 'warning',
                'entity': 'embajadores',
                'message': f'{emb_sin_marca} embajadores sin marca',
                'count': emb_sin_marca,
            })
    except Exception as e:
        issues.append({'severity': 'error', 'entity': 'embajadores', 'message': str(e)})

    # 8. Marcas sin coordinador
    try:
        total_marcas = db.query(func.count(Marcas.id)).scalar() or 0
        marcas_sin_coord = db.query(func.count(Marcas.id)).filter(
            (Marcas.coordinador == None) | (Marcas.coordinador == '')
        ).scalar() or 0
        stats['marcas'] = {'total': total_marcas, 'sin_coordinador': marcas_sin_coord}
        if marcas_sin_coord > 0:
            issues.append({
                'severity': 'info',
                'entity': 'marcas',
                'message': f'{marcas_sin_coord} marcas sin coordinador asignado',
                'count': marcas_sin_coord,
            })
    except Exception as e:
        issues.append({'severity': 'error', 'entity': 'marcas', 'message': str(e)})

    # Calculate health score
    total_checks = 8
    error_checks = len([i for i in issues if i['severity'] == 'error'])
    warning_checks = len([i for i in issues if i['severity'] == 'warning'])
    health_score = max(0, 100 - (error_checks * 15) - (warning_checks * 5))

    return {
        'health_score': health_score,
        'total_issues': len(issues),
        'issues': issues,
        'stats': stats,
    }


# ============================================
# 8. FEATURE FLAGS  
# ============================================

class FeatureFlagCreate(BaseModel):
    name: str
    description: Optional[str] = None
    enabled: bool = False


class FeatureFlagUpdate(BaseModel):
    enabled: Optional[bool] = None
    description: Optional[str] = None


@router.get("/feature-flags")
async def get_feature_flags(user: user_dependency, db: db_dependency):
    _require_developer(user)
    flags = db.query(FeatureFlag).order_by(FeatureFlag.name).all()
    return [{
        'id': f.id,
        'name': f.name,
        'description': f.description,
        'enabled': f.enabled,
        'created_at': f.created_at.isoformat() if f.created_at else None,
        'updated_at': f.updated_at.isoformat() if f.updated_at else None,
    } for f in flags]


@router.post("/feature-flags")
async def create_feature_flag(
    flag: FeatureFlagCreate,
    user: user_dependency,
    db: db_dependency
):
    _require_developer(user)

    existing = db.query(FeatureFlag).filter(FeatureFlag.name == flag.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f'Feature flag "{flag.name}" ya existe')

    new_flag = FeatureFlag(
        name=flag.name,
        description=flag.description,
        enabled=flag.enabled,
    )
    db.add(new_flag)

    activity = ActivityLog(
        user_id=user.get('id'),
        user_name=user.get('username'),
        action='feature_flag_created',
        entity_type='feature_flag',
        details=json.dumps({'name': flag.name, 'enabled': flag.enabled}),
    )
    db.add(activity)
    db.commit()

    return {'message': f'Feature flag "{flag.name}" creado', 'id': new_flag.id}


@router.put("/feature-flags/{flag_id}")
async def update_feature_flag(
    flag_id: int,
    update: FeatureFlagUpdate,
    user: user_dependency,
    db: db_dependency
):
    _require_developer(user)

    flag = db.query(FeatureFlag).filter(FeatureFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail='Feature flag no encontrado')

    changes = {}
    if update.enabled is not None:
        changes['enabled'] = {'from': flag.enabled, 'to': update.enabled}
        flag.enabled = update.enabled
    if update.description is not None:
        flag.description = update.description

    activity = ActivityLog(
        user_id=user.get('id'),
        user_name=user.get('username'),
        action='feature_flag_updated',
        entity_type='feature_flag',
        entity_id=flag_id,
        details=json.dumps({'name': flag.name, 'changes': changes}),
    )
    db.add(activity)
    db.commit()

    return {'message': f'Feature flag "{flag.name}" actualizado'}


@router.delete("/feature-flags/{flag_id}")
async def delete_feature_flag(
    flag_id: int,
    user: user_dependency,
    db: db_dependency
):
    _require_developer(user)

    flag = db.query(FeatureFlag).filter(FeatureFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail='Feature flag no encontrado')

    name = flag.name
    db.delete(flag)

    activity = ActivityLog(
        user_id=user.get('id'),
        user_name=user.get('username'),
        action='feature_flag_deleted',
        entity_type='feature_flag',
        entity_id=flag_id,
        details=json.dumps({'name': name}),
    )
    db.add(activity)
    db.commit()

    return {'message': f'Feature flag "{name}" eliminado'}


# ============================================
# EXTRA: Request logs browser
# ============================================

@router.get("/request-logs")
async def get_request_logs(
    user: user_dependency,
    db: db_dependency,
    limit: int = Query(100, le=500),
    method: Optional[str] = None,
    path_contains: Optional[str] = None,
    status_min: Optional[int] = None,
    status_max: Optional[int] = None,
):
    _require_developer(user)

    query = db.query(RequestLog).order_by(desc(RequestLog.created_at))
    if method:
        query = query.filter(RequestLog.method == method.upper())
    if path_contains:
        query = query.filter(RequestLog.path.contains(path_contains))
    if status_min:
        query = query.filter(RequestLog.status_code >= status_min)
    if status_max:
        query = query.filter(RequestLog.status_code <= status_max)

    logs = query.limit(limit).all()

    return [{
        'id': log.id,
        'method': log.method,
        'path': log.path,
        'status_code': log.status_code,
        'response_time_ms': log.response_time_ms,
        'user_id': log.user_id,
        'user_role': log.user_role,
        'ip_address': log.ip_address,
        'error_detail': log.error_detail,
        'created_at': log.created_at.isoformat() if log.created_at else None,
    } for log in logs]


# ============================================
# EXTRA: Clear old logs
# ============================================

@router.delete("/request-logs/cleanup")
async def cleanup_request_logs(
    user: user_dependency,
    db: db_dependency,
    days_old: int = Query(7, ge=1, le=90)
):
    _require_developer(user)

    cutoff = datetime.utcnow() - timedelta(days=days_old)
    deleted = db.query(RequestLog).filter(RequestLog.created_at < cutoff).delete()
    db.commit()

    activity = ActivityLog(
        user_id=user.get('id'),
        user_name=user.get('username'),
        action='logs_cleanup',
        entity_type='request_logs',
        details=json.dumps({'days_old': days_old, 'deleted_count': deleted}),
    )
    db.add(activity)
    db.commit()

    return {'message': f'{deleted} logs eliminados (>{days_old} días)'}
