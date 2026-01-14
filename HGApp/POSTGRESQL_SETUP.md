# 🐘 Migración a PostgreSQL - SGPME

## ✅ COMPLETADO

Tu sistema ha sido migrado de SQLite a PostgreSQL.

## 🚀 GUÍA DE CONFIGURACIÓN

### 1. Instalar PostgreSQL (solo primera vez)

**macOS:**

```bash
cd HGApp
chmod +x setup_postgres_macos.sh setup_postgres.sh
./setup_postgres_macos.sh
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Configurar variables de entorno

Edita el archivo `.env`:

```bash
DB_TYPE=postgresql
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sgpme
```

### 3. Inicializar la base de datos

```bash
cd HGApp
./setup_postgres.sh
```

O manualmente:

```bash
createdb sgpme
python3 init_postgres.py
```

### 4. Instalar dependencias (si es necesario)

```bash
pip install python-dotenv
```

### 5. Iniciar el servidor

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 📦 SISTEMA DE BACKUPS

### Backup Manual

```bash
python3 backup_postgres.py
```

### Configurar Backups Automáticos (Cron)

Edita cron:

```bash
crontab -e
```

Agregar (backup diario a las 2 AM):

```cron
0 2 * * * cd /ruta/completa/a/HGApp && python3 backup_postgres.py >> backups/backup.log 2>&1
```

### Restaurar Backup

Listar backups disponibles:

```bash
python3 restaurar_postgres.py
```

Restaurar específico:

```bash
python3 restaurar_postgres.py backups/diarios/sgpme_backup_20250129.dump
```

## 🌐 CONFIGURACIÓN PARA HOSTINGER

### 1. Crear Base de Datos en Hostinger

1. Accede al panel de Hostinger
2. Ve a "Bases de datos" → "Administrar"
3. Crea nueva base de datos PostgreSQL
4. Anota: nombre_bd, usuario, contraseña, host

### 2. Configurar .env en servidor

```bash
DB_TYPE=postgresql
DB_USER=tu_usuario_hostinger
DB_PASSWORD=tu_password_hostinger
DB_HOST=tu_host_hostinger.com
DB_PORT=5432
DB_NAME=tu_basededatos
```

### 3. Subir archivos por SSH/FTP

```bash
# Backend
HGApp/
├── main.py
├── database.py
├── models.py
├── init_postgres.py
├── backup_postgres.py
├── restaurar_postgres.py
├── requirements.txt
├── .env
└── routers/

# NO subir:
- sgpme.db (SQLite viejo)
- backups/ (solo en local)
- __pycache__/
- *.log
```

### 4. Instalar dependencias en servidor

```bash
pip install -r requirements.txt
```

### 5. Inicializar DB en servidor

```bash
python3 init_postgres.py
```

### 6. Configurar Cron en Hostinger

```bash
crontab -e
```

Agregar:

```cron
0 2 * * * cd /home/usuario/HGApp && python3 backup_postgres.py >> backups/backup.log 2>&1
```

## 🔒 SEGURIDAD IMPORTANTE

### Antes de Deploy a Producción:

1. **Cambiar contraseña de admin:**

```sql
psql -d sgpme
UPDATE usuarios SET password_hash = crypt('nueva_password_segura', gen_salt('bf')) WHERE username = 'admin';
```

2. **Variables de entorno seguras:**

```bash
DB_PASSWORD=password_MUY_seguro_123!@#
JWT_SECRET_KEY=clave_secreta_super_larga_y_aleatoria_456$%^
```

3. **Permisos de archivos:**

```bash
chmod 600 .env
chmod 700 backups/
```

4. **Firewall de PostgreSQL:**

- Solo permitir conexiones desde tu aplicación
- Configurar `pg_hba.conf` restrictivamente

## ✅ VENTAJAS DE POSTGRESQL

- ✅ Múltiples usuarios simultáneos sin problemas
- ✅ Backups con `pg_dump` estándar industrial
- ✅ Mejor rendimiento con datos grandes
- ✅ Sistema de roles y permisos robusto
- ✅ Replicación y alta disponibilidad
- ✅ Tipos de datos avanzados
- ✅ Transacciones ACID completas

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "role does not exist"

```bash
createuser -s postgres
```

### Error: "database does not exist"

```bash
createdb sgpme
```

### Error de conexión

Verificar que PostgreSQL esté corriendo:

```bash
# macOS
brew services list

# Linux
sudo systemctl status postgresql
```

### Ver logs de PostgreSQL

**macOS:**

```bash
tail -f /usr/local/var/log/postgres.log
```

**Linux:**

```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## 📊 COMANDOS ÚTILES PostgreSQL

```bash
# Conectar a la base de datos
psql -d sgpme

# Ver tamaño de la BD
SELECT pg_size_pretty(pg_database_size('sgpme'));

# Ver tablas
\dt

# Ver usuarios
\du

# Salir
\q
```

## 🔄 MIGRACIÓN DE DATOS (si lo necesitas)

Si tienes datos en SQLite que quieres migrar:

```bash
# Exportar de SQLite
sqlite3 sgpme.db .dump > sqlite_dump.sql

# Convertir y importar a PostgreSQL
# (requiere ajustes manuales de sintaxis)
```

## 📝 CHECKLIST PRE-DEPLOY

- [ ] PostgreSQL instalado y corriendo en Hostinger
- [ ] Base de datos creada
- [ ] Variables de entorno configuradas
- [ ] Dependencias instaladas
- [ ] `init_postgres.py` ejecutado
- [ ] Contraseña de admin cambiada
- [ ] Backups automáticos configurados en cron
- [ ] Permisos de archivos configurados
- [ ] Frontend apuntando a la URL correcta del backend
- [ ] SSL/HTTPS configurado
- [ ] Firewall configurado

¡Tu sistema está listo para producción con PostgreSQL! 🚀
