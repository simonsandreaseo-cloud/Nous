# Proposal: BullMQ + Upstash Redis (Robustez Total)

## Intent

Implementar un sistema de procesamiento en segundo plano basado en colas para desacoplar tareas intensivas (scraping, análisis de IA) del flujo principal de tRPC. Esto garantiza respuestas inmediatas al usuario, reintentos automáticos ante fallos y una observabilidad total a través de logs de auditoría.

## Scope

### In Scope
- Paquete interno `@nous/jobs` para centralizar definiciones de colas y jobs.
- Integración de BullMQ con Upstash Redis como backend.
- Endpoint tRPC para encolar investigaciones que devuelva un `jobId` inmediato.
- Worker independiente preparado para desplegarse como "Background Worker" en Render.
- Sistema de reintentos (retries) con backoff exponencial.
- Emisión de `AuditLogs` en formato JSON idénticos a `SerpService`.

### Out of Scope
- Interfaz administrativa completa para gestión de colas (solo logs y base de datos por ahora).
- Escalado automático de workers (se manejará manualmente en Render).

## Capabilities

### New Capabilities
- `background-jobs`: Gestión de ciclo de vida de tareas asíncronas, reintentos y persistencia de estado.
- `job-observability`: Stream de `AuditLogs` y tracking de progreso para tareas encoladas.

### Modified Capabilities
- `intelligence-core`: Adaptar la orquestación de IA para ejecutarse dentro de un worker de BullMQ.

## Approach

1. **Infraestructura**: Configurar conexión a Upstash Redis usando SSL y el cliente de BullMQ.
2. **Monorepo**: Crear `packages/jobs` (o `src/lib/jobs` si no hay monorepo estricto) para compartir tipos y lógica entre el cliente (Next.js) y el worker.
3. **Worker**: Implementar un proceso Node.js liviano que cargue el contexto de servicios necesarios para ejecutar el scraping y la IA.
4. **tRPC**: Crear un router `jobRouter` con procedimientos para `start`, `status` y `cancel`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/jobs` | New | Nueva lógica de colas y workers. |
| `src/app/api/trpc` | New/Modified | Integración de `jobRouter`. |
| `src/lib/services` | Modified | Adaptación para ser consumidos por el worker. |
| `render.yaml` | Modified | Configuración del nuevo servicio de worker. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Latencia de Upstash Redis | Med | Usar conexiones persistentes y pools optimizados. |
| Límites de memoria en Render | Low | Optimizar el worker para no cargar todo el framework de Next.js si no es necesario. |
| Desincronización de estado | Med | Usar eventos de BullMQ para actualizar Supabase en tiempo real. |

## Rollback Plan

Revertir a procesamiento síncrono en los endpoints de tRPC (aunque esto afectaría el timeout) y eliminar la dependencia de Redis.

## Dependencies

- Upstash Redis Instance.
- BullMQ (npm package).

## Success Criteria

- [ ] tRPC devuelve un `jobId` en menos de 200ms.
- [ ] El worker procesa tareas de scraping e IA exitosamente.
- [ ] Las tareas fallidas se reintentan automáticamente 3 veces.
- [ ] Los logs de auditoría JSON se guardan correctamente en la base de datos durante el proceso.
