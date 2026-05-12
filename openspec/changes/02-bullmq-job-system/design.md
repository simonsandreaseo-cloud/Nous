# Design: BullMQ Job System

## Technical Approach
Implement a distributed task queue system using BullMQ and Upstash Redis to move intensive operations (SEO research, IA analysis, project auditing) out of the main request thread. This ensures high availability, better user experience (instant feedback), and reliability through automatic retries.

## Architecture Decisions

### Decision: Backend de Colas
**Choice**: BullMQ + Upstash Redis (SSL).
**Alternatives considered**: In-memory queues (Node-cache), RabbitMQ, SQS.
**Rationale**: BullMQ is highly performant and feature-rich for Node.js. Upstash Redis allows for a serverless setup that scales perfectly with the current infra (Next.js + Render) without managing complex clusters.

### Decision: Estructura de @nous/jobs
**Choice**: Paquete interno en `src/lib/jobs`.
**Rationale**: Centraliza la lógica de productores y consumidores. Aunque no es un monorepo físico, se tratará como un módulo aislado para facilitar una futura extracción si el worker crece demasiado.

## Data Flow
```
Client (UI) ──> tRPC (research.queue) ──> BullMQ (Redis) ──> Worker
     ^                                                         │
     │                                                         ▼
     └───────── Polling (research.status) <── AuditLogs (DB) <── Service Execution
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/jobs/index.ts` | Create | Exportación de la API pública del sistema de colas. |
| `src/lib/jobs/queue.ts` | Create | Definición de `researchQueue` y lógica de encolamiento. |
| `src/lib/jobs/worker.ts` | Create | Lógica del consumidor (Worker) que procesa los jobs. |
| `src/lib/jobs/types.ts` | Create | Definiciones de tipos para payloads y estados. |
| `src/app/api/trpc/[trpc]/route.ts` | Modify | Registro del nuevo `jobRouter`. |
| `src/server/routers/job.ts` | Create | Router tRPC para `queue` y `status`. |
| `src/lib/services/intelligence.ts` | Modify | Adaptar para aceptar `traceId` y reportar progreso. |

## Interfaces / Contracts

### tRPC Job Router
```typescript
const jobRouter = router({
  queue: publicProcedure
    .input(z.object({ 
      topic: z.string(), 
      projectId: z.string(),
      options: z.object({ depth: z.number().optional() }).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      const traceId = ctx.traceId ?? crypto.randomUUID();
      const job = await researchQueue.add('research-task', { 
        ...input, 
        traceId 
      });
      return { jobId: job.id, traceId };
    }),

  status: publicProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const job = await researchQueue.getJob(input.jobId);
      if (!job) throw new TRPCError({ code: 'NOT_FOUND' });
      
      return {
        id: job.id,
        state: await job.getState(),
        progress: job.progress,
        result: job.returnvalue,
        failedReason: job.failedReason
      };
    })
});
```

### Traceability & AuditLogger
El worker inyectará el `traceId` en el contexto del servicio:
```typescript
// src/lib/jobs/worker.ts
const worker = new Worker('research-queue', async (job) => {
  const { traceId, topic, projectId } = job.data;
  
  // Inyectar contexto de auditoría
  const logger = new AuditLogger({ traceId, projectId });
  
  try {
    await IntelligenceService.process({ topic, logger, onProgress: (p) => job.updateProgress(p) });
  } catch (err) {
    logger.error("Job failed", { error: err.message });
    throw err;
  }
}, { connection });
```

## Error Handling Strategy
- **Retry Policy**: Los jobs fallidos se reintentarán automáticamente **3 veces**.
- **Backoff**: Exponencial empezando en 1000ms (`attemptsMade ** 2 * 1000`).
- **Dead Letter**: Si falla tras 3 intentos, el job se marca como `failed` y se emite un `AuditLog` crítico con el stack trace completo y el `traceId` para debugging.

## Testing Strategy
| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `researchQueue.add` | Mock de BullMQ para verificar que el payload incluye `traceId`. |
| Integration | Worker flow | Test de integración con una instancia local de Redis (o Miniredis). |
| E2E | tRPC Polling | Playwright test: Encolar -> Polling hasta 'completed'. |
