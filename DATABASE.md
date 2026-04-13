# Nous 2.0 - Database & Analytics Manual

Este documento es la **Fuente de Verdad** sobre la arquitectura de datos de Nous 2.0. Si eres un agente de IA o un desarrollador, lee esto antes de realizar cambios en el esquema.

## 1. Arquitectura: Registry vs Metrics (Ultra-Storage v2)

Debido a los límites de almacenamiento de Supabase (7GB), hemos implementado una estrategia de **Particionamiento Vertical** para manejar grandes volúmenes de URLs (250k+).

### El Inventario (`project_urls`)
Esta es la tabla "ancla". Solo almacena la identidad de la URL.
- **Formato:** Almacenamos el `path` relativo (ej. `/productos/lentes`) en lugar de la URL completa para ahorrar espacio y facilitar el matching entre GSC y GA4.
- **Campos:** `id`, `project_id`, `url`, `status`, `last_audited_at`.

### Las Métricas (`project_url_metrics`)
Las estadísticas de rendimiento viven en una tabla separada.
- **Regla de Oro:** Solo existen filas para URLs que han tenido actividad real (**Clicks > 0, Impresiones > 0 o Sesiones GA4 > 0**).
- Esto elimina el "peso muerto" del ~70% de las URLs indexadas que no tienen tráfico.

### Las Fuentes de Tráfico (`url_traffic_sources`)
En lugar de campos JSONB pesados, las fuentes de GA4 se normalizan aquí.
- **Relación:** `url_id` -> `source`, `sessions`.

---

## 2. Flujo de Sincronización (The Sync Bridge)

La data de Google Search Console (GSC) y GA4 se unifica a través de dos canales:

### A. Edge Function: `gsc-sync`
- **Propósito:** Sincronización diaria automatizada (Cron Job).
- **Alcance:** Trae **Totales del Sitio** (Clicks totales, Impresiones totales por día y Sesiones totales).
- **Ubicación:** `/supabase/functions/gsc-sync`.

### B. Servicio: `GscService.ts`
- **Propósito:** Sincronización profunda de URLs.
- **Lógica:**
    1. Descarga el "Top Pages" de GSC.
    2. Cruza con el Inventario local.
    3. Descarga métricas de comportamiento de GA4.
    4. **Filtro:** Solo guarda keywords con impresiones >= 3.
    5. Distribuye la data en `project_url_metrics` y `url_traffic_sources`.

---

## 3. Diccionario de Funciones RPC (Remote Procedure Calls)

Este proyecto usa funciones PL/pgSQL para lógica compleja y seguridad.

| Función | Uso Principal | Descripción |
| :--- | :--- | :--- |
| `get_semantic_inventory_matches` | **UI/Escritor** | Busca URLs semánticamente relacionadas usando `pg_trgm`. |
| `is_team_member` | **Seguridad** | Usada en RLS para verificar acceso del usuario por equipo. |
| `is_team_owner` | **Seguridad** | Usada en RLS para permisos de administración. |
| `exec_sql` | **Migración** | Permite ejecutar DDL/DML desde scripts de servidor (Uso restringido). |
| `handle_new_user` | **Trigger** | Crea automáticamente el perfil y equipo inicial al registrarse. |

---

## 4. Guía de Consultas (Para Agentes)

Si necesitas consultar el inventario completo con sus métricas, utiliza siempre la **Vista Enriquecida**:

```sql
-- Obtener el Top 10 de páginas con mayor tasa de rebote
SELECT url, bounce_rate, sessions 
FROM view_project_urls_enriched 
WHERE sessions > 100 
ORDER BY bounce_rate DESC 
LIMIT 10;
```

> [!TIP]
> **Performance:** Nunca hagas un `SELECT *` sobre `project_urls` sin un filtro por `project_id`. El índice `idx_project_urls_project_id_url` es el más eficiente para búsquedas de inventario.

---

## 5. Contacto & Mantenimiento
Cualquier cambio en el esquema debe ser reflejado en este documento y verificado contra la vista `view_project_urls_enriched` para asegurar la estabilidad del frontend.
