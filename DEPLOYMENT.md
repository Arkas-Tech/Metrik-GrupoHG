# Deployment Automation - Metrik

Sistema de deployment automático configurado con GitHub Webhooks + PM2 para actualizaciones sin downtime.

## 🚀 Estado Actual

✅ **COMPLETADO**
- PM2 configurado con 3 servicios:
  - `metrik-backend`: Backend FastAPI (Puerto 8080)
  - `metrik-frontend`: Frontend Next.js (Puerto 3030)
  - `metrik-webhook`: Servidor webhook (Puerto 9001)
- Webhook server escuchando en http://72.60.26.170:9001
- Script de deployment `deploy.sh` con health checks
- Puerto 9001 abierto en firewall
- Servicios corriendo y estables

## 📋 Configurar Webhook en GitHub

### Paso 1: Ir a Configuración del Repositorio

1. Abre https://github.com/Arkas-Tech/Metrik-GrupoHG
2. Ve a **Settings** → **Webhooks** → **Add webhook**

### Paso 2: Configurar el Webhook

Completa los siguientes campos:

| Campo | Valor |
|-------|-------|
| **Payload URL** | `http://72.60.26.170:9001/webhook` |
| **Content type** | `application/json` |
| **Secret** | `7ddf072ba7afe35a12faf54b020297330060e7439459446fa67cf51b48d1f315` |
| **SSL verification** | ⚠️ Disable (porque usamos HTTP, no HTTPS) |
| **Which events?** | Solo "Push events" |
| **Active** | ✅ Checked |

### Paso 3: Guardar

Haz clic en **Add webhook**

## 🧪 Probar el Deployment

### Método 1: Desde VSCode (Recomendado)

1. Abre el proyecto en VSCode
2. Haz un cambio pequeño (por ejemplo, edita un README.md)
3. Ve a la vista de **Source Control** (Ctrl+Shift+G)
4. Escribe un commit message
5. Haz clic en **Commit** y luego **Sync Changes**
6. El webhook ejecutará el deployment automáticamente

### Método 2: Desde Terminal

```bash
# Hacer un cambio
echo "Test deployment" >> README.md

# Commit y push
git add README.md
git commit -m "test: Verificando deployment automático"
git push origin main
```

## 📊 Monitorear el Deployment

### Ver logs del webhook en tiempo real

```bash
ssh arkastech 'tail -f /home/sgpme/app/logs/webhook.log'
```

### Ver logs del deployment

```bash
ssh arkastech 'tail -f /home/sgpme/app/logs/deploy.log'
```

### Ver estado de los servicios

```bash
ssh arkastech 'pm2 list'
```

### Ver logs de los servicios

```bash
# Backend
ssh arkastech 'pm2 logs metrik-backend --lines 50'

# Frontend  
ssh arkastech 'pm2 logs metrik-frontend --lines 50'

# Webhook
ssh arkastech 'pm2 logs metrik-webhook --lines 50'
```

## 🔍 Verificar Salud de los Servicios

```bash
# Health check del webhook
curl http://72.60.26.170:9001/health

# Backend API docs
curl http://metrik.grupohg.com.mx/api/docs

# Frontend
curl https://metrik.grupohg.com.mx
```

## 🔄 Proceso de Deployment

Cuando haces push a `main`:

1. **GitHub** envía webhook a `http://72.60.26.170:9001/webhook`
2. **Webhook server** verifica la firma de GitHub
3. **Webhook server** ejecuta `/home/sgpme/app/deploy.sh`
4. **Deploy script**:
   - Hace `git pull` para obtener cambios
   - Verifica si `requirements.txt` cambió → reinstala dependencias Python
   - Verifica si `package.json` cambió → reinstala dependencias Node + rebuild
   - Ejecuta `pm2 reload` (zero-downtime)
   - Verifica que servicios estén online
   - Ejecuta health checks HTTP
5. **Resultado** registrado en `/home/sgpme/app/logs/deploy.log`

## 🎯 Zero-Downtime

PM2 garantiza cero downtime usando el comando `reload`:
- Inicia nuevas instancias en paralelo
- Espera a que estén listas
- Cambia el tráfico a las nuevas
- Termina las instancias viejas

Tu aplicación **nunca se cae** durante el deployment. Los 20 usuarios pueden seguir trabajando sin interrupción.

## 🛠️ Comandos Útiles

```bash
# Reiniciar manualmente sin downtime
ssh arkastech 'pm2 reload metrik-backend metrik-frontend'

# Reiniciar con downtime (más rápido)
ssh arkastech 'pm2 restart metrik-backend metrik-frontend'

# Ver procesos
ssh arkastech 'pm2 list'

# Ver monitoreo en tiempo real
ssh arkastech 'pm2 monit'

# Salvar configuración actual
ssh arkastech 'pm2 save'

# Ver última actividad del webhook
ssh arkastech 'tail -50 /home/sgpme/app/logs/webhook.log'
```

## 🐛 Troubleshooting

### El webhook no se ejecuta

1. Verifica que el webhook esté configurado en GitHub
2. Ve a GitHub → Settings → Webhooks → Recent Deliveries
3. Revisa si hay errores en las entregas

### Deployment falla

```bash
# Ver logs completos
ssh arkastech 'cat /home/sgpme/app/logs/deploy.log'

# Verificar estado de git
ssh arkastech 'cd /home/sgpme/app && git status'

# Verificar PM2
ssh arkastech 'pm2 list'
```

### Servicios no responden

```bash
# Reiniciar servicios
ssh arkastech 'pm2 restart metrik-backend metrik-frontend'

# Ver logs de errores
ssh arkastech 'pm2 logs metrik-backend --err --lines 100'
```

## 🔐 Seguridad

- ✅ Webhook protegido con secreto de 256 bits
- ✅ Verificación HMAC-SHA256 de firma de GitHub
- ✅ Solo acepta push events al branch `main`
- ✅ Logs completos de todas las operaciones
- ✅ Servicios corriendo con permisos restringidos

## 📝 Próximos Pasos (Opcionales)

1. **HTTPS**: Configurar SSL/TLS para el webhook (Let's Encrypt)
2. **Notificaciones**: Enviar notificación a Slack/Email cuando deployment completa
3. **Rollback**: Script automático para revertir a versión anterior si falla
4. **Staging**: Branch `develop` para testing antes de production
5. **Health Checks**: Monitoreo continuo con alertas (UptimeRobot, Pingdom)

---

**🎉 ¡Deployment automático configurado con éxito!**

Ahora solo necesitas hacer "Commit & Sync" desde VSCode y tus cambios se deployarán automáticamente sin afectar a los usuarios.
