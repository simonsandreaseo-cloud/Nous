# Vector Memory Engine Specification

## Purpose
Define the behavior of the semantic memory and recall system for Nous 3.0, enabling long-term context retention using vector embeddings and similarity search via pgvector and Gemini.

## Requirements

### Requirement: semantic-memory

The system MUST convert text fragments into 768-dimensional vectors to enable semantic indexing and storage in the `knowledge_base`.

#### Scenario: Generate and store vector for valid fragment

- GIVEN a text fragment of 100 characters
- AND a valid `project_id`
- WHEN the vectorization process is triggered
- THEN the system MUST generate a 768-dimensional vector using the Gemini embedding model
- AND the system MUST save the vector, `project_id`, and metadata (URL of origin, title) to the database for future retrieval.

#### Scenario: Ignore very short fragments

- GIVEN a text fragment shorter than 50 characters
- WHEN the vectorization process is triggered
- THEN the system MUST NOT generate a vector
- AND the system SHALL NOT save the fragment to the database to optimize storage and performance.

### Requirement: ai-recall

The system MUST allow retrieving relevant context based on cosine similarity search within a specific project's data isolation.

#### Scenario: Retrieve relevant fragments for a query

- GIVEN a semantic query from the user
- AND a target `project_id`
- WHEN the similarity search is executed
- THEN the system MUST filter fragments by `project_id` BEFORE performing any vector comparison
- AND the system MUST return a maximum of 5 fragments most relevant to the query based on cosine similarity.

#### Scenario: No relevant context found

- GIVEN a semantic query that has no relevant matches in the specified `project_id`
- WHEN the similarity search is executed
- THEN the system MUST return an empty list of fragments.
