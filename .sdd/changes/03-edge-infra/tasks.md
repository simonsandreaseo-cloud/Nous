# Task Breakdown: 03-edge-infra (Edge Infrastructure Migration)

## Phase 1: Preparation & Setup
- [ ] 1.1 Extract direct connection string from Supabase Dashboard (Settings > Database > Connection String > Direct).
- [ ] 1.2 Create Cloudflare Hyperdrive configuration:
  `npx wrangler hyperdrive create supabase-pool --connection-string="postgres://..."`
- [ ] 1.3 Update `.env.local` to include the new `HYPERDRIVE_ID` for local reference.

## Phase 2: Worker Initialization
- [ ] 2.1 Initialize a new Wrangler project in `packages/edge-orchestrator`:
  `npx wrangler init packages/edge-orchestrator`
- [ ] 2.2 Configure `wrangler.toml` with the Hyperdrive binding.
- [ ] 2.3 Add secrets to the worker:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (secret)
  - `JWT_SECRET` (secret)

## Phase 3: Implementation
- [ ] 3.1 Implement JWT validation middleware using `jose` or `jsonwebtoken` (native edge support).
- [ ] 3.2 Implement a sample database query through Hyperdrive to verify connectivity.
- [ ] 3.3 Port the AI logic (`executeWithKeyRotation`) to the Worker environment.

## Phase 4: Verification & Routing
- [ ] 4.1 Perform stress test on the Hyperdrive pool.
- [ ] 4.2 Configure Cloudflare CNAME or Routes to point `/api/ai/*` to the Worker.
- [ ] 4.3 Verify end-to-end auth context persistence.
