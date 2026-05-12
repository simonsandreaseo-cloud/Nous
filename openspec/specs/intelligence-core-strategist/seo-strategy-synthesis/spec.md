# SEO Strategy Synthesis Specification

## Purpose

Synthesize a superior SEO strategy by analyzing competitor content. This domain uses LLMs to generate high-impact H1s and identify search intent, with a strict requirement for transparent strategic reasoning.

## Requirements

### Requirement: Master H1 and Search Intent Generation

The system MUST generate a "Master H1" and identify the primary "Search Intent" based on the aggregated content of analyzed competitors.

#### Scenario: Generate strategy from competitor data

- GIVEN clean text content from multiple competitors
- WHEN the synthesis process is triggered
- THEN the system MUST produce a single optimized H1
- AND the system MUST identify the dominant Search Intent (e.g., Informational, Transactional)

### Requirement: Auditable LLM Integration

The system MUST use a Large Language Model (Gemini or Groq) through an auditable interface for all strategic decisions.

#### Scenario: Auditable LLM call

- GIVEN the need for strategic synthesis
- WHEN the system calls the LLM
- THEN the prompt, the model version, and the raw response MUST be logged in the audit trail
- AND the call MUST be traceable to the specific analysis session

### Requirement: Strategic Reasoning Documentation

The system SHALL document and log the "Strategic Reasoning" behind every generated H1 to explain why it is superior to the competition.

#### Scenario: Log strategic reasoning

- GIVEN a generated Master H1
- WHEN the synthesis completes
- THEN the system MUST log a "Razonamiento Estratégico" section
- AND this reasoning MUST explicitly compare the generated H1 against the common patterns found in competitors
- AND the reasoning MUST justify why the chosen H1 is better for SEO performance
