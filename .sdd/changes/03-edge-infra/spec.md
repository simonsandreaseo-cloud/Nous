# Technical Specification: 03-edge-infra (Edge Infrastructure Migration)

## 1. Overview
This specification defines the requirements for migrating the backend logic of Nous 2.0 to Cloudflare Workers, integrating Supabase Hyperdrive for database pooling, and ensuring unified authentication.

## 2. Requirements

### 2.1 Connectivity (Hyperdrive)
- **REQ-1**: The system MUST connect to the Supabase Postgres database via a Cloudflare Hyperdrive binding.
- **REQ-2**: The connection string MUST use the direct Supabase hostname (not the transaction bouncer) to allow Hyperdrive to manage pooling.
- **REQ-3**: Response time for a simple DB query from the Edge Worker SHOULD be < 50ms in most regions.

### 2.2 Authentication (Supabase SSR)
- **REQ-4**: The Worker MUST be able to verify Supabase JWTs found in the `sb-access-token` cookie or `Authorization` header.
- **REQ-5**: Verification MUST be performed locally (using the Supabase JWT Secret) to avoid round trips to the Auth server.
- **REQ-6**: Session context (user_id, role) MUST be available to all downstream logic within the Worker.

### 2.3 Environment & Secrets
- **REQ-7**: Sensible data (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) MUST be stored as Cloudflare Secrets.
- **REQ-8**: Application settings MUST be synced between `.env.local` and `wrangler.toml` (vars).

## 3. Scenarios

### Scenario 1: Successful DB Query via Hyperdrive
**Given** a Cloudflare Worker configured with a Hyperdrive binding for Supabase
**When** a request is processed that requires a database read
**Then** the Worker SHALL execute the query through the Hyperdrive proxy
**And** the result SHALL be returned to the client with minimal overhead.

### Scenario 2: Edge Authentication Validation
**Given** a request from a logged-in user with a valid Supabase JWT
**When** the request hits the Cloudflare Worker
**Then** the Worker SHALL decrypt and verify the JWT using the shared secret
**And** the Worker SHALL permit access if the token is valid.

### Scenario 3: Unauthorized Access Rejection
**Given** a request without a valid authentication token
**When** the request targets a protected Edge endpoint
**Then** the Worker SHALL return a `401 Unauthorized` response without querying the database.

---
*Created by: Antigravity AI (Senior Architect)*
