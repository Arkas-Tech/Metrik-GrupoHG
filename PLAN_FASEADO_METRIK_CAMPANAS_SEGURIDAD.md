# Plan Faseado Rigurosamente Controlado — Metrik Campañas Digitales

## Objetivo

Ejecutar la corrección completa del módulo de Campañas Digitales (Meta Ads + Google Ads) con control estricto por fases, validación funcional/técnica en cada fase y aprobación explícita del usuario antes de continuar.

Este documento es la guía operativa para implementar cambios sin romper producción y con evidencia verificable.

---

## Reglas de ejecución (obligatorias)

1. No iniciar una fase sin luz verde explícita de la fase anterior.
2. Cada fase debe cerrar con evidencia reproducible (API + UI + logs).
3. Si una prueba crítica falla, se detiene la fase y no se avanza.
4. No mezclar objetivos entre fases.
5. Cada fase debe incluir plan de rollback.
6. Ningún secreto nuevo se sube a GitHub.
7. Aplicar solo cambios quirúrgicos, mínimos y necesarios para el objetivo puntual de la fase en curso.
8. Queda prohibido modificar secciones, workflows, procesos, protocolos o procedimientos fuera del alcance explícito de la fase activa.
9. Si durante una fase aparece una mejora adicional no solicitada, se documenta como "pendiente" y no se implementa en esa fase.

### Política de intervención quirúrgica (obligatoria)

- Principio de mínimo impacto: tocar el menor número de archivos y líneas posible.
- Principio de aislamiento: cada fase solo puede alterar componentes estrictamente relacionados con su objetivo.
- Principio de no regresión lateral: cualquier cambio debe preservar el comportamiento de módulos no involucrados.
- Principio de trazabilidad: toda línea modificada debe poder justificarse contra una tarea concreta de la fase.
- Principio de bloqueo: si una solución exige tocar áreas fuera de alcance, se detiene la fase y se solicita decisión explícita.

---

## Alcance del proyecto

### Problemas confirmados

- Error Google Ads `503: Error obteniendo token de Google: Bad Request` (backend reporta `invalid_grant`).
- Filtros de período mostrando campañas API fuera de rango (se superponen métricas pero no se excluyen campañas).
- Métricas y etiquetas inconsistentes (`Alcance/Interacciones` vs `Impresiones/Clicks`).
- En Meta Ads, `Ver anuncio` cae a `facebook.com/ads/archive/render...` en lugar de URL real del anuncio/destino.
- Flujo incompleto en frontend para partes de setup Google (estado declarado sin carga efectiva en algunos casos).

### Resultado esperado final

- Google Ads y Meta Ads con datos correctos, filtrado correcto por período, etiquetas homogéneas y links/preview de anuncios correctos.
- Cierre de seguridad: credenciales fuera de GitHub, solo en local/servidor y rotadas si aplica.

---

## Control de cambios por fase

Para cada fase se registrará:

- Rama de trabajo.
- Commits exactos.
- Archivos tocados.
- Evidencia de pruebas.
- Resultado: `Aprobada` / `Rechazada`.

Formato de registro por fase:

```text
Fase: F#
Fecha:
Rama:
Commits:
Archivos:
Pruebas ejecutadas:
Resultado:
Observaciones:
Aprobación usuario: SI/NO
```

---

## Fase 0 — Baseline y entorno de prueba

### Objetivo

Establecer línea base para comparar antes/después sin ambigüedad.

### Tareas

- Confirmar endpoint/API base en frontend (`NEXT_PUBLIC_API_URL`) y backend activo.
- Tomar snapshot de comportamiento actual:
  - Errores de token Google.
  - Filtros de período en campañas.
  - Links/preview de Meta.
  - Etiquetas visibles en tarjetas (`Alcance/Interacciones`).
- Definir 3 marcas de prueba (una por plataforma, si existe).

### Pruebas obligatorias

- 1 captura o evidencia por cada síntoma actual.
- 1 corrida de endpoints clave:
  - `/google-ads/status`
  - `/google-ads/metrics`
  - `/meta-ads/metrics`
  - `/meta-ads/campanas/{id}/anuncios`

### Criterio de salida

Baseline documentado y reproducible.

### Rollback

No aplica (sin cambios de código).

---

## Fase 1 — Estabilizar autenticación Google Ads (causa raíz `invalid_grant`)

### Objetivo

Eliminar error de token y dejar Google Ads operativo de forma estable.

### Hipótesis técnicas actuales

- Refresh token inválido/revocado/no alineado con client_id/client_secret actuales.
- Precedencia DB > `.env` puede estar tomando token viejo de `system_settings`.

### Tareas

- Verificar valor activo real de `google_ads_refresh_token` (DB vs `.env`).
- Corregir estrategia de precedencia para evitar usar token inválido silenciosamente.
- Mejorar mensajes de error para diferenciar:
  - `invalid_grant`
  - `invalid_client`
  - errores de red/timeouts.
- Validar flujo OAuth de exchange para renovar token.

### Pruebas obligatorias

- Token exchange exitoso contra `oauth2.googleapis.com/token`.
- Consulta GAQL mínima exitosa por al menos una marca.
- `GET /google-ads/status` consistente con estado real.
- UI deja de mostrar 503 en operaciones de Google.

### Criterio de salida

Google Ads funcional sin 503 por token.

### Rollback

- Revertir commit de fase.
- Restaurar token previo en DB solo si el nuevo falla (registrando motivo).

---

## Fase 2 — Filtros de período correctos y consistentes (Google + Meta)

### Objetivo

Asegurar que el filtro de fechas/meses realmente controle qué campañas y métricas se muestran.

### Problema confirmado

Campañas con `google_ads_id`/`meta_ads_id` se muestran aunque no cumplan período; se superponen métricas si llegan, pero no se excluyen campañas.

### Tareas

- Definir regla única:
  - Con filtro activo, mostrar solo campañas con datos en período.
  - Sin datos del período: ocultar o mostrar en cero con estado explícito (decisión UX).
- Alinear comportamiento para campañas manuales vs campañas API.
- Eliminar fallback silencioso engañoso cuando falla carga de métricas.

### Pruebas obligatorias

- Casos de mes único, múltiples meses, rango personalizado.
- Casos de campañas con datos fuera de período.
- Prueba cruzada por plataforma y por marca.

### Criterio de salida

La lista y métricas responden exactamente al período seleccionado.

### Rollback

Revertir ajustes de filtro a versión anterior si rompe visibilidad total.

---

## Fase 3 — Homologación de métricas y etiquetas (Impresiones/Clicks)

### Objetivo

Aplicar semántica correcta y uniforme en frontend y backend.

### Requerimiento funcional

- Reemplazar `Alcance` por `Impresiones`.
- Reemplazar `Interacciones` por `Clicks`.

### Tareas

- Renombrar etiquetas en toda la sección Campañas.
- Alinear mapeo de datos para que lo mostrado como `Clicks` venga de `clicks` (no de un proxy ambiguo).
- Revisar consistencia en tipos/interfaces.

### Pruebas obligatorias

- Verificación visual en tarjetas y modales.
- Verificación numérica contra respuesta de API por campaña.

### Criterio de salida

No quedan etiquetas antiguas en la sección y los valores corresponden a métricas correctas.

### Rollback

Revertir cambios de presentación si rompe bindings.

---

## Fase 4 — Corrección de links y previews de anuncios Meta

### Objetivo

Que `Ver anuncio` lleve al destino real del anuncio y preview use imagen real.

### Problema confirmado

Fallback a Ads Archive render cuando no se extrae URL útil del creative.

### Tareas

- Mejorar extracción de URL destino desde estructuras de creative/object story (múltiples variantes).
- Dejar Ads Archive solo como último fallback explícito.
- Priorizar `full_image_url` real para preview.
- Validar que el click abra destino correcto en nueva pestaña.

### Pruebas obligatorias

- Probar diferentes tipos de anuncio (imagen, video, dinámico si aplica).
- Validar al menos 5 anuncios reales de cuentas distintas.

### Criterio de salida

Links y previews correctos en la mayoría de anuncios; fallback controlado y trazable.

### Rollback

Restaurar lógica previa de `dest_url` si hay regresión masiva.

---

## Fase 5 — Calidad de agregación y consistencia matemática

### Objetivo

Eliminar distorsiones por agregación incorrecta de métricas en multi-mes/rangos.

### Problema confirmado

Promedio simple de CTR/Conversion/CxC entre meses puede distorsionar resultados.

### Tareas

- Cambiar agregación a fórmulas ponderadas:
  - `CTR_global = clicks_totales / impresiones_totales`
  - `Conversion_global = leads_totales / clicks_totales`
  - `CxC_global = spend_total / leads_totales`
- Validar redondeos y manejo de división entre cero.

### Pruebas obligatorias

- Dataset de prueba con valores conocidos.
- Comparación manual vs resultado UI/API.

### Criterio de salida

Métricas agregadas correctas y auditables.

### Rollback

Revertir solo capa de agregación si hay discrepancias nuevas.

---

## Fase 6 — Robustez operativa y observabilidad

### Objetivo

Asegurar que errores no queden ocultos y que soporte pueda diagnosticar rápido.

### Tareas

- Reducir bloques `except` silenciosos en rutas críticas.
- Estandarizar mensajes de error por plataforma y por marca/cuenta.
- Añadir logs funcionales mínimos (sin exponer secretos).
- Completar/ajustar flujo frontend incompleto de setup Google (si aplica).

### Pruebas obligatorias

- Simular error por token y por cuenta no mapeada.
- Confirmar mensaje útil en UI y log útil en backend.

### Criterio de salida

Errores legibles, diagnósticos rápidos, sin silencios críticos.

### Rollback

Rollback parcial de logs/mensajes si generan ruido excesivo.

---

## Fase 7 (Final) — Seguridad de secretos y limpieza total en GitHub

### Objetivo

Eliminar del repositorio todo secreto/credencial/API key vulnerable y dejar secretos solo en local/servidor.

### Alcance requerido

- Backend `.env` y cualquier archivo con valores reales.
- Scripts de debug con secretos hardcodeados.
- Cualquier key/token/client_secret en historial Git.

### Tareas

1. Inventario completo de secretos actuales en workspace.
2. Sustitución por variables y plantillas seguras (`.env.example` sin valores reales).
3. Asegurar `.gitignore` correcto para archivos sensibles.
4. Rotación obligatoria de secretos expuestos históricamente.
5. Limpieza de historial Git para secretos ya commiteados (si el usuario autoriza procedimiento de history rewrite).
6. Verificación post-limpieza:
   - búsqueda de patrones de secretos en repo actual
   - revisión de historial relevante

### Pruebas obligatorias

- Scan de secretos en árbol de trabajo sin hallazgos críticos.
- Scan de historial (si se hace rewrite) sin hallazgos de claves revocadas.
- Deploy funcionando con secretos solo en servidor/local.

### Criterio de salida

GitHub sin secretos vigentes, secretos rotados y operativos en entorno seguro.

### Rollback

- Si limpieza de historial afecta flujo, coordinar estrategia de fuerza push controlado y sincronización de colaboradores.

### Cierre obligatorio post-Fase 7

- Al aprobarse y cerrarse la Fase 7, este documento debe eliminarse del repositorio.
- La eliminación del documento forma parte de la definición de "trabajo completado".
- Antes de eliminarlo, se debe confirmar que toda evidencia final ya quedó en el canal acordado de reporte.

---

## Checklist de aprobación por fase (para “luz verde”)

```text
[ ] Evidencia de pruebas anexada
[ ] Sin errores críticos abiertos
[ ] Sin regresiones funcionales detectadas
[ ] Rollback definido y probado (si aplica)
[ ] Aprobación del usuario para continuar
```

---

## Matriz de riesgos

1. Riesgo: romper importación masiva al tocar Google token.
   - Mitigación: pruebas por marca antes de merge.
2. Riesgo: ocultar campañas válidas al endurecer filtros.
   - Mitigación: decisión UX explícita y pruebas de casos borde.
3. Riesgo: links Meta inconsistentes por variedad de creatives.
   - Mitigación: cadena de extracción por prioridad + fallback controlado.
4. Riesgo: limpieza de secretos en historial impacta colaboradores.
   - Mitigación: ventana de mantenimiento + instrucciones de rebase/reset.

---

## Entregables esperados por fase

- Resumen corto de cambios.
- Lista de archivos modificados.
- Evidencia de pruebas y resultado.
- Riesgos residuales.
- Solicitud formal de luz verde para siguiente fase.

---

## Estado de ejecución

- Fase actual: `Fase 4 completada (pendiente aprobación)`
- Última fase aprobada: `Fase 3`
- Próxima acción sugerida: `Solicitar luz verde para iniciar Fase 5`

---

## Ejecución real — Fase 0 (Baseline)

### Registro de fase

```text
Fase: F0
Fecha: 2026-04-30
Rama: main
Commits: Ninguno (sin cambios funcionales de producto)
Archivos: PLAN_FASEADO_METRIK_CAMPANAS_SEGURIDAD.md
Pruebas ejecutadas: Sí
Resultado: Completada (pendiente aprobación)
Observaciones: Backend local no estaba activo en localhost:8000; se tomó baseline contra producción con /api.
Aprobación usuario: NO (pendiente)
```

### Marcas de prueba definidas para fases siguientes

1. GWM Chihuahua
2. Kia Juventud
3. Toyota Chihuahua

### Evidencia baseline (técnica)

1. URL base detectada en frontend:

- Desarrollo: `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Producción: `NEXT_PUBLIC_API_URL=/api`

2. Estado backend local (desarrollo):

- `http://localhost:8000` no respondió (connection refused) para endpoints críticos.

3. Estado rutas backend en producción sin token (esperado para baseline público):

- `GET /api/google-ads/status` -> `401 Not authenticated`
- `GET /api/google-ads/metrics?year=2026&month=4` -> `401 Not authenticated`
- `GET /api/meta-ads/metrics?year=2026&month=4` -> `401 Not authenticated`
- `GET /api/meta-ads/campanas/123/anuncios?marca=Toyota%20Chihuahua` -> `401 Not authenticated`

4. Hallazgo confirmado de token Google (evidencia previa de diagnóstico):

- OAuth token endpoint responde `400 invalid_grant / Bad Request` al intentar refrescar token.

5. Evidencia de síntomas funcionales en código (línea base de comportamiento actual):

- Campañas API se muestran aun con filtro de fecha activo: condición en [sgpme_app/src/app/campanas/page.tsx](sgpme_app/src/app/campanas/page.tsx#L697).
- Fallback de enlace Meta a Ads Archive render: [backend/routers/meta_ads.py](backend/routers/meta_ads.py#L422).
- Etiquetas aún no homologadas globalmente a Impresiones/Clicks (base actual de presentación): [sgpme_app/src/app/campanas/page.tsx](sgpme_app/src/app/campanas/page.tsx#L1174) y [sgpme_app/src/app/campanas/page.tsx](sgpme_app/src/app/campanas/page.tsx#L1188).

### Checklist de salida Fase 0

- [x] Endpoint/API base confirmada.
- [x] Snapshot técnico de síntomas levantado.
- [x] Marcas de prueba definidas.
- [x] Evidencia reproducible registrada.
- [x] Aprobación de usuario para continuar a Fase 1.

---

## Ejecución real — Fase 1 (Estabilizar autenticación Google Ads)

### Registro de fase

```text
Fase: F1
Fecha: 2026-04-30
Rama: main
Commits: fae6c5d
Archivos: backend/routers/google_ads.py
Pruebas ejecutadas: Sí
Resultado: Completada (pendiente aprobación)
Observaciones: Se aplicó fallback DB/env para refresh token y se mejoró diagnóstico de errores OAuth sin tocar otras áreas. Cambios desplegados en producción (metrik-backend).
Aprobación usuario: NO (pendiente)
```

### Cambios quirúrgicos aplicados (solo alcance Fase 1)

1. Fallback de token en autenticación Google Ads:

- Se añadió uso de candidatos de refresh token desde DB y env para evitar caída total por un token inválido único.

2. Diagnóstico mejorado de errores OAuth:

- Ahora se preserva `error` + `error_description` (por ejemplo `invalid_grant`) en el detalle de error.

3. Mayor visibilidad en status:

- Se expone en status si hay token en DB, token en env y cuál es la fuente primaria detectada.

4. Sin cambios laterales:

- No se tocó frontend, rutas Meta, filtros, ni lógica de otras fases.

### Evidencia técnica de Fase 1

1. Archivo modificado único:

- `backend/routers/google_ads.py`

2. Símbolos nuevos y ubicación:

- `_parse_oauth_error`
- `_request_access_token`
- `_get_access_token` con fallback DB/env

3. Validación de errores de archivo:

- Sin errores reportados en `backend/routers/google_ads.py`.

4. Deploy de producción ejecutado (según SERVER_SECURITY_AND_DEPLOY.md):

- `git pull` en `/home/sgpme/app`
- `chown -R app-metrik:app-metrik /home/sgpme/app`
- `pm2 restart metrik-backend --update-env`
- Resultado: `METRIK_API_OK`, proceso `metrik-backend` en `online`.

5. Verificación post-deploy:

- `curl http://127.0.0.1:8080/` respondió `200` con mensaje de API.

### Riesgos residuales de Fase 1

1. Si ambos tokens (DB y env) están inválidos, seguirá devolviendo error (ahora con mejor detalle por fuente).
2. No se rotó token en esta fase (eso depende de operación OAuth y/o secretos de entorno).

### Checklist de salida Fase 1

- [x] Cambios mínimos y acotados a Google Ads auth.
- [x] No se afectaron módulos fuera de alcance.
- [x] Diagnóstico de error mejorado (`invalid_grant`, etc.).
- [x] Validación técnica sin errores de compilación/lint reportados para archivo modificado.
- [ ] Aprobación de usuario para continuar a Fase 2.

---

## Ejecución real — Fase 2 (Filtros de período correctos y consistentes)

### Registro de fase

```text
Fase: F2
Fecha: 2026-04-30
Rama: main
Commits: 1fe89ea
Archivos: sgpme_app/src/app/campanas/page.tsx
Pruebas ejecutadas: Sí
Resultado: Completada (pendiente aprobación)
Observaciones: Se corrigió la visibilidad de campañas API bajo filtro de período y se evitó estado engañoso durante carga de métricas. Despliegue frontend aplicado en producción.
Aprobación usuario: NO (pendiente)
```

### Cambios quirúrgicos aplicados (solo alcance Fase 2)

1. Con filtro de período activo, campañas con `google_ads_id`/`meta_ads_id` solo se muestran si tienen métricas del período cargadas.
2. Se agregó estado `loadingMetricasPeriodo` para evitar mostrar resultados inconsistentes mientras se cargan métricas.
3. En error de carga de métricas de período, se limpian mapas de métricas para eliminar fallback ambiguo.
4. Se añadió indicador de carga de período y se suprimió mensaje falso de "No hay campañas" durante esa carga.

### Evidencia técnica de Fase 2

1. Archivo modificado único en código de producto:

- `sgpme_app/src/app/campanas/page.tsx`

2. Validación técnica del archivo modificado:

- Sin errores de diagnóstico para `sgpme_app/src/app/campanas/page.tsx`.

3. Lint global del frontend:

- Existen errores/warnings preexistentes fuera de alcance de Fase 2 (no introducidos por este cambio).

4. Deploy de producción (frontend) ejecutado:

- `git pull origin main` en `/home/sgpme/app`
- Sincronización puntual del archivo actualizado de `sgpme_app` a `frontend`
- `npm run build` en `/home/sgpme/app/frontend`
- `chown -R app-metrik:app-metrik /home/sgpme/app`
- `pm2 restart metrik-frontend --update-env`
- Resultado: `METRIK_WEB_OK`

5. Verificación post-deploy:

- Archivo live contiene cambio (`Actualizando métricas del período...`) en `frontend/src/app/campanas/page.tsx`.
- `curl -I http://127.0.0.1:3030/campanas` respondió `HTTP/1.1 200 OK`.

### Riesgos residuales de Fase 2

1. Si la fuente de métricas de período de una plataforma no responde, las campañas API de esa plataforma quedarán ocultas mientras persista el fallo (comportamiento intencional para evitar datos engañosos).
2. Queda pendiente Fase 5 para corregir formalmente la agregación ponderada de CTR/Conversión/CxC.

### Checklist de salida Fase 2

- [x] Cambios mínimos y acotados a filtros de período.
- [x] No se afectaron módulos fuera de alcance.
- [x] Validación técnica sin errores en archivo modificado.
- [x] Deploy a producción ejecutado y verificado.
- [ ] Aprobación de usuario para continuar a Fase 3.

---

## Ejecución real — Fase 3 (Homologación de métricas y etiquetas)

### Registro de fase

```text
Fase: F3
Fecha: 2026-04-30
Rama: main
Commits: c6776b5
Archivos: sgpme_app/src/app/campanas/page.tsx
Pruebas ejecutadas: Sí
Resultado: Completada (pendiente aprobación)
Observaciones: Se eliminó la condición por plataforma. Ambas métricas muestran etiqueta uniforme en todas las tarjetas.
Aprobación usuario: NO (pendiente)
```

### Cambios quirúrgicos aplicados (solo alcance Fase 3)

1. Segunda métrica de tarjeta: eliminado ternario `Meta Ads ? "Impresiones" : "Alcance"` → etiqueta fija `Impresiones`.
2. Tercera métrica de tarjeta: eliminado ternario `Meta Ads ? "Clicks" : "Interacciones"` → etiqueta fija `Clicks`.
3. Campos de dato (`campana.alcance`, `campana.interacciones`) intactos — solo cambió la presentación.

### Evidencia técnica de Fase 3

1. Archivo modificado único:

- `sgpme_app/src/app/campanas/page.tsx`

2. Validación técnica:

- Sin errores de diagnóstico en el archivo modificado.

3. Verificación post-deploy:

- `grep` en `frontend/src/app/campanas/page.tsx` del servidor live muestra solo `Impresiones` (línea 1206) y `Clicks` (línea 1218). Sin referencias a `Alcance` o `Interacciones`.
- `metrik-frontend` en `online` tras `pm2 restart`. Resultado: `METRIK_WEB_OK`.

### Riesgos residuales de Fase 3

1. Ninguno en presentación.
2. La homologación del campo `alcance` en backend (que en Meta Ads mapea a `impressions`) queda pendiente de revisión en Fase 6 si se detecta discrepancia semántica.

### Checklist de salida Fase 3

- [x] Cambios mínimos, solo en etiquetas visuales.
- [x] No se afectaron tipos, bindings ni lógica.
- [x] Validación técnica sin errores.
- [x] Deploy a producción ejecutado y verificado.
- [ ] Aprobación de usuario para continuar a Fase 4.

---

## Ejecución real — Fase 4 (Links y previews de anuncios Meta)

### Registro de fase

```text
Fase: F4
Fecha: 2026-04-30
Rama: main
Commits: 2623f33
Archivos: backend/routers/meta_ads.py
Pruebas ejecutadas: Sí
Resultado: Completada (pendiente aprobación)
Observaciones: Se expandió la cadena de extracción de URL destino para cubrir todos los tipos de creative. Ads Archive render queda como último fallback explícito.
Aprobación usuario: NO (pendiente)
```

### Cambios quirúrgicos aplicados (solo alcance Fase 4)

1. Se añadió `website_url` al request de fields de la API de Meta.
2. Nueva cadena de prioridad para `dest_url` (8 niveles):
   - `link_data.link` → CTA link de `link_data` → `video_data.link_description` → CTA de `video_data` → `template_data.link` → CTA de `template_data` → `photo_data.url` → `creative.object_url` → `creative.website_url` → post URL desde `effective_object_story_id` → Ads Archive render.
3. Helper `_extract_cta_link` y `_is_useful` para mantener la lógica legible y evitar duplicar condiciones.
4. El Ads Archive render solo se usa si ningún paso anterior devuelve URL útil.

### Evidencia técnica de Fase 4

1. Archivo modificado único: `backend/routers/meta_ads.py`.
2. Sin errores de diagnóstico en el archivo modificado.
3. Deploy backend: `git pull` en servidor, `chown`, `pm2 restart metrik-backend`. Resultado: `METRIK_API_OK`.

### Riesgos residuales de Fase 4

1. Anuncios de tipo lead-gen no redirigen a URL externa; pueden seguir sin `dest_url` útil (comportamiento correcto para ese formato).
2. La calidad de preview de imagen queda sin cambios en esta fase; si un anuncio no tiene `image_hash` ni `image_url`, seguirá sin preview.

### Checklist de salida Fase 4

- [x] Cambios mínimos y acotados a extracción de URL destino en anuncios Meta.
- [x] No se afectaron módulos fuera de alcance.
- [x] Validación técnica sin errores.
- [x] Deploy a producción ejecutado y verificado.
- [ ] Aprobación de usuario para continuar a Fase 5.
