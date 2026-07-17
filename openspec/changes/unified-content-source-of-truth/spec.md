# Specification: Unified Content Source of Truth (SSOT)

## Purpose
Eliminate the "Double-Write" architecture by removing `content_body` from the `tasks` table and designating `task_contents` as the sole authoritative store for article HTML content. This ensures data consistency, reduces database redundancy, and simplifies the content pipeline.

## Requirements

### Requirement: Data Consolidation (Migration)
The system MUST ensure all existing content in `tasks.content_body` is migrated/mirrored to `task_contents` before the column is dropped.

#### Scenario: Migration Integrity
- GIVEN a database with tasks containing content in `tasks.content_body`
- WHEN the migration script is executed
- THEN all `content_body` values MUST be copied to the corresponding `task_contents` record
- AND the `tasks.content_body` column SHALL ONLY be dropped after verification that no data was lost.

### Requirement: SSOT Write
All operations that update article content (Editor, AI Pipelines, Queue Handlers) MUST write exclusively to the `task_contents` table.

#### Scenario: Content Update via Editor
- GIVEN an open article in the Editor
- WHEN the user saves changes to the content
- THEN the system MUST execute a write only to the `task_contents` table
- AND no update SHALL be sent to the `tasks` table for content-related fields.

### Requirement: SSOT Read
All requests for article content (Editor initialization, Export, AI input) MUST read exclusively from the `task_contents` table.

#### Scenario: Editor Initialization
- GIVEN a request to open a task in the Editor
- WHEN the system fetches the article content
- THEN it MUST perform a join or separate query to the `task_contents` table
- AND it SHALL NOT attempt to read from `tasks.content_body`.

### Requirement: Type Integrity
The `Task` TypeScript type MUST not include `content_body`, forcing compile-time errors for any redundant writes.

#### Scenario: Compile-time Enforcement
- GIVEN a code change that attempts to access `task.content_body`
- WHEN the TypeScript compiler runs
- THEN it MUST throw a type error indicating that `content_body` does not exist on type `Task`.

### Requirement: Linear Chaining
The "Orb" pipeline in `EditorialCalendar.tsx` MUST ensure that for each step in a chain, it fetches the most recent content from `task_contents` before starting the next AI process.

#### Scenario: Pipeline Continuity
- GIVEN a sequence of AI tasks (e.g., Investigate $\rightarrow$ Draft)
- WHEN the "Draft" step starts
- THEN the system MUST fetch the output of the "Investigate" step from `task_contents`
- AND this latest version MUST be passed as input to the AI prompt.

## Non-Functional Requirements

- **Performance**: Content fetching from `task_contents` SHOULD have negligible latency compared to reading from `tasks`.
- **Egress Efficiency**: The Planner's list view MUST maintain low egress by continuing to fetch only metadata from `tasks`.
- **Consistency**: Any content update MUST be immediately available for the next step in a chain without needing a full page refresh.

## Verification Scenarios

### Scenario A: The Linear Chain
- GIVEN a set of chained AI tasks (Investigate $\rightarrow$ Draft $\rightarrow$ Humanize)
- WHEN the pipeline is executed
- THEN verify that the Humanize step receives the output of the Draft step (fetched from `task_contents`).

### Scenario B: The Editor Sync
- GIVEN an article open in the Editor
- WHEN the user updates content and triggers a background "Clean" task
- THEN verify that the Editor reflects the cleaned content (read from `task_contents`) without a manual page reload.

### Scenario C: The Export Test
- GIVEN multiple tasks with content in `task_contents`
- WHEN the user exports these tasks to CSV/TSV
- THEN verify that the exported content is correctly retrieved from the `task_contents` table.

### Scenario D: The Migration Safety
- GIVEN the completion of the migration script
- WHEN the `tasks.content_body` column is dropped
- THEN verify that all articles still have their content accessible via `task_contents` with 100% data parity.
