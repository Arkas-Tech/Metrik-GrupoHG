# 📦 Sistema de Backups - SGPME

## 🎯 Descripción

Sistema automático de backups con rotación para la base de datos SQLite en producción.

## 📋 Estructura de Backups

```
backups/
├── diarios/          # Últimos 7 días
├── semanales/        # Últimas 4 semanas
└── mensuales/        # Últimos 6 meses
```

## 🚀 Configuración Inicial

### 1. Hacer ejecutables los scripts

```bash
chmod +x backup_db.py
chmod +x restaurar_backup.py
chmod +x backup_remoto.py
```

### 2. Probar el backup manual

```bash
python3 backup_db.py
```

### 3. Configurar Cron (Backups Automáticos)

Edita el crontab:

```bash
crontab -e
```

Agrega esta línea para backup diario a las 2 AM:

```cron
0 2 * * * cd /ruta/completa/a/HGApp && /usr/bin/python3 backup_db.py >> backups/backup.log 2>&1
```

O para backup cada 6 horas:

```cron
0 */6 * * * cd /ruta/completa/a/HGApp && /usr/bin/python3 backup_db.py >> backups/backup.log 2>&1
```

## 📖 Uso

### Crear Backup Manual

```bash
python3 backup_db.py
```

### Listar Backups Disponibles

```bash
python3 restaurar_backup.py
```

### Restaurar un Backup

```bash
python3 restaurar_backup.py backups/diarios/sgpme_backup_20250129_140000.db
```

### Backup Remoto (Opcional)

#### A AWS S3:

```bash
# Instalar boto3
pip install boto3

# Configurar AWS credentials
aws configure

# Configurar variable de entorno
export S3_BUCKET_NAME="tu-bucket-backups"

# Ejecutar backup remoto
python3 backup_remoto.py
```

#### A Servidor Remoto via SCP:

```bash
# Configurar SSH key sin contraseña
ssh-copy-id usuario@servidor-remoto

# Ejecutar backup
python3 backup_remoto.py
```

## ⚙️ Política de Retención

- **Diarios**: 7 backups (última semana)
- **Semanales**: 4 backups (último mes)
- **Mensuales**: 6 backups (últimos 6 meses)

Los backups más antiguos se eliminan automáticamente.

## 🔒 Mejores Prácticas

### 1. Antes de Actualizaciones Importantes

```bash
# Crear backup manual antes de deploy
python3 backup_db.py
```

### 2. Verificar Backups Regularmente

```bash
# Listar y verificar que existen backups
python3 restaurar_backup.py
```

### 3. Probar Restauración Periódicamente

```bash
# En ambiente de desarrollo, probar restaurar backup
python3 restaurar_backup.py backups/diarios/sgpme_backup_latest.db
```

### 4. Mantener Backups Fuera del Servidor

- Usar `backup_remoto.py` para subir a S3 o servidor remoto
- Configurar cron para backups remotos diarios
- Mantener al menos una copia en otra ubicación

### 5. Monitorear Tamaño de Base de Datos

El script muestra el tamaño de la BD en cada backup. Si crece mucho:

- Considerar limpieza de datos antiguos
- Archivar datos históricos
- Optimizar la base de datos: `VACUUM`

## 🆘 Recuperación ante Desastres

### Si la base de datos se corrompe:

1. Detener el servidor:

```bash
pkill -f uvicorn
```

2. Restaurar último backup:

```bash
python3 restaurar_backup.py backups/diarios/sgpme_backup_[último].db
```

3. Reiniciar el servidor:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Si perdiste todos los backups locales:

1. Recuperar del backup remoto (S3 o servidor)
2. Descargar el backup más reciente
3. Restaurar usando `restaurar_backup.py`

## 📊 Monitoreo

### Ver log de backups:

```bash
tail -f backups/backup.log
```

### Ver espacio usado por backups:

```bash
du -sh backups/
```

### Verificar que cron está funcionando:

```bash
grep CRON /var/log/syslog | tail -20
```

## 🔧 Configuración Avanzada

### Variables de Entorno

Puedes configurar en `.env`:

```bash
# AWS S3
S3_BUCKET_NAME=tu-bucket-backups
AWS_ACCESS_KEY_ID=tu-key
AWS_SECRET_ACCESS_KEY=tu-secret
AWS_REGION=us-east-1

# Servidor Remoto
REMOTE_BACKUP_HOST=backup.tudominio.com
REMOTE_BACKUP_USER=backupuser
REMOTE_BACKUP_PATH=/backups/sgpme
```

## ⚠️ IMPORTANTE

- **NO** versionar la carpeta `backups/` en Git
- Agregar `backups/` al `.gitignore`
- Los backups contienen datos sensibles
- Cifrar backups si se suben a servicios de terceros
- Mantener permisos restrictivos: `chmod 600` en archivos de backup

## 📝 .gitignore

Asegúrate de tener esto en tu `.gitignore`:

```gitignore
# Backups
backups/
*.db
*.log

# Excepto el directorio (para mantener la estructura)
!backups/.gitkeep
```
