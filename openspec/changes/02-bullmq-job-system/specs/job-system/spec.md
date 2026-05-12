# Job System Specification

## Purpose
Define the queueing system behavior for background tasks using BullMQ and Upstash Redis, ensuring reliable processing and observability.

## Requirements

### Requirement: Reliable Job Enqueueing
The system MUST provide a mechanism to enqueue intensive tasks for asynchronous processing without blocking the main execution thread.

#### Scenario: Enqueueing a Research Task
- GIVEN a valid research request
- WHEN a client initiates the investigation via tRPC
- THEN the system MUST return a unique `jobId` within 200ms
- AND the task MUST be successfully added to the `research.queue` in Redis.

### Requirement: Worker Lifecycle and Fault Tolerance
The system SHALL implement workers that consume jobs from the queue and MUST handle failures gracefully.

#### Scenario: Automatic Retries on Failure
- GIVEN a job in execution that fails due to a transient error
- WHEN the worker detects the failure
- THEN the system MUST retry the job up to 3 times
- AND it SHALL apply an exponential backoff strategy between retries to avoid overwhelming downstream services.

#### Scenario: Job Stalling Detection
- GIVEN a worker that crashes or becomes unresponsive while processing a job
- WHEN the BullMQ visibility timeout expires
- THEN the system MUST move the job back to the `waiting` state for another worker to pick up.

### Requirement: Real-time Job Observability
The system MUST provide endpoints to query the state and progress of any enqueued job.

#### Scenario: Status Polling
- GIVEN an active `jobId`
- WHEN a client requests the status via tRPC
- THEN the system MUST return one of the following states: `waiting`, `active`, `completed`, `failed`, or `delayed`
- AND the response MUST include the current progress percentage if set by the worker.

### Requirement: Auditable Job Execution
All background jobs MUST emit structured audit logs that are linked to the original request via a consistent trace identifier.

#### Scenario: Log Traceability in Workers
- GIVEN a job enqueued with a `traceId` and `auditContext`
- WHEN the worker processes the job
- THEN all JSON audit logs emitted MUST include the same `traceId`
- AND these logs MUST be persisted in the `AuditLogs` table for long-term auditing.
