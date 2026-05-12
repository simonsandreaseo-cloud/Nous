# Performance Persistence Specification

## Purpose
This specification defines the persistence layer using Drizzle ORM to ensure maximum performance and efficient resource management.

## Requirements

### Requirement: Drizzle ORM as Sole Access Point
The system MUST use Drizzle ORM as the exclusive interface for all database interactions. Direct SQL strings or other ORMs SHALL NOT be used.

#### Scenario: Data retrieval through Drizzle
- GIVEN a database request from an application service
- WHEN the service requires persistence data
- THEN the system MUST process the request using Drizzle ORM API exclusively
- AND direct SQL execution SHOULD NOT occur outside Drizzle's driver abstractions.

### Requirement: Database Client Singleton
The database client MUST be implemented as a singleton instance to prevent connection exhaustion, specifically for deployments on Render or serverless environments.

#### Scenario: Preventing connection leakage
- GIVEN multiple concurrent API requests
- WHEN the application accesses the database
- THEN the system MUST return the existing singleton database client instance
- AND no new database connections SHALL be initialized per request.

### Requirement: Mandatory Explicit Projections
The system SHALL NOT use `SELECT *` or return all table columns by default. Every query MUST explicitly define the required columns (projections).

#### Scenario: Optimized data fetching
- GIVEN a query to the `tasks` table
- WHEN the system executes the fetch
- THEN it MUST explicitly select only the necessary columns (e.g., `id`, `title`)
- AND it SHALL NOT include unrelated columns (e.g., `created_at`, `status`) unless requested.

#### Scenario: Prohibition of SELECT *
- GIVEN a developer attempts to fetch an entire record without explicit projections
- WHEN the Drizzle query is composed
- THEN the system MUST require an explicit `.select({ ... })` block with specific column mapping.
