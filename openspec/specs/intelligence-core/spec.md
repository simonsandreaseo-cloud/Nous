# Intelligence Core Specification

## Purpose

Define the foundational auditing and logging capabilities for the Intelligence Engine, ensuring high observability and traceability of research tasks.

## Requirements

### Requirement: JSON Audit Logging

The `AuditLogger` MUST emit all audit logs in a structured JSON format to ensure machine readability and integration with cloud logging platforms (e.g., Render Logs).

#### Scenario: Log Emission in JSON

- GIVEN an active `AuditLogger` instance
- WHEN a message is logged
- THEN the output MUST be a valid JSON string
- AND the JSON MUST contain `timestamp`, `level`, and `message` fields.

### Requirement: Traceability via TraceId

Every log entry SHALL include a `traceId` property. This ID MUST be consistent across all micro-tasks and services participating in the same investigation or research request.

#### Scenario: Grouping Micro-tasks by TraceId

- GIVEN a research investigation with multiple sub-tasks
- WHEN the system executes these tasks
- THEN every log produced by any component MUST include the same `traceId`
- AND a developer MUST be able to filter logs by `traceId` to see the full lifecycle of that investigation.

### Requirement: Quality of Thought Transparency

Audit logs MUST capture the "quality of thought" behind intelligence decisions. This includes the reasoning, context, and decision-making process for key actions (e.g., why a specific search query was formulated).

#### Scenario: Auditing Query Decision Rationale

- GIVEN the `SerpService` is about to perform a search
- WHEN it selects a specific multiplexed query variation
- THEN it MUST log the selected query AND the rationale for choosing it
- AND the log MUST provide enough context for a human auditor to evaluate the "intelligence" of the decision.
