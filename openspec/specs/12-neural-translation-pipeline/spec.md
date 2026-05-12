# Neural Translation Pipeline Specification

## Purpose

This specification defines the behavior for the neural translation engine, ensuring layout preservation through HTML tag protection and managing asynchronous translation jobs using a robust queue system.

## Requirements

### Requirement: layout-preserved-translation

The system MUST protect HTML structure and layout during the translation process by employing numeric markers for inline tags and preserving structural tags.

1. The system MUST identify and replace inline HTML tags (specifically `<b>`, `<i>`, and `<a>`) with numeric markers (e.g., `[[1]]`, `[[2]]`) before sending the text to the translation engine.
2. The system MUST restore the original HTML tags from the numeric markers after translation is received.
3. The system MUST translate the text content within each cell (`<td>`) of an HTML table without altering structural tags (`<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`).
4. The system SHALL fail the translation task and log a "Data Integrity Error" if the number of markers in the translated output does not exactly match the number of markers in the input.
5. The system MUST correctly handle nested inline tags within table cells, such as bold text (`<b>`) inside a cell (`<td>`).

#### Scenario: Translating text with inline formatting

- GIVEN a text string: "Hello <b>world</b>, visit <a href='https://nous.com'>our site</a>"
- WHEN the translation pipeline is executed
- THEN the system MUST send "Hello [[1]]world[[2]], visit [[3]]our site[[4]]" to the translation engine
- AND the final output MUST restore the tags correctly in the target language.

#### Scenario: Translating an HTML table with bold content

- GIVEN an HTML table: `<table><tr><td>Item <b>A</b></td><td>$10</td></tr></table>`
- WHEN the translation pipeline is executed
- THEN the structural tags `<table>`, `<tr>`, `<td>` MUST remain unchanged
- AND the content "Item [[1]]A[[2]]" MUST be translated and markers restored
- AND the final output MUST be a valid HTML table with the translated content.

#### Scenario: Data Integrity Mismatch

- GIVEN an input with 2 markers: "Translate [[1]]this[[2]]"
- WHEN the translation engine returns an output with 1 marker: "Traducir [[1]]esto"
- THEN the system SHALL fail the job
- AND the status MUST be updated to `FAILED` with an "Integrity mismatch" error.

### Requirement: asynchronous-translation-jobs

The system MUST process translation requests asynchronously to ensure scalability and provide real-time progress updates to the user.

1. The system MUST use BullMQ as the underlying job queue system for translation tasks.
2. The system SHALL report the translation progress using at least the following four states: `QUEUED`, `PARSING`, `TRANSLATING`, and `COMPLETED`.
3. The system MUST create and save a new task for the translated version, linked to the original task via a `translation_parent_id` field.

#### Scenario: Successful asynchronous translation flow

- GIVEN a translation request for an existing task
- WHEN the job is submitted
- THEN the system MUST set the status to `QUEUED` in BullMQ
- AND transition to `PARSING` while identifying HTML tags and markers
- AND transition to `TRANSLATING` while awaiting the neural engine response
- AND transition to `COMPLETED` upon successful restoration and saving.

#### Scenario: Persistence of translated version

- GIVEN a completed translation job for task ID `123`
- WHEN the result is saved to the database
- THEN a new task record MUST be created
- AND its `translation_parent_id` MUST be set to `123`
- AND its content MUST contain the fully restored translated HTML.
