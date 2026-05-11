# Delta for content-humanizer

## ADDED Requirements

### Requirement: Iterative Humanization
The "Humanize" action MUST be available to the user regardless of the current value of the `is_humanized` flag in the content metadata.

#### Scenario: Re-humanizing Content
- GIVEN a piece of content that has already been humanized (`is_humanized: true`)
- WHEN the user triggers the "Humanize" action again
- THEN the system MUST allow the process to start
- AND the system MUST overwrite the previous humanized content with the new result

### Requirement: Metadata Refresh
Upon successful completion of a humanization process, the system MUST update the content metadata.

#### Scenario: Metadata Update on Success
- GIVEN a humanization process has just completed successfully
- WHEN the result is saved
- THEN the system MUST set `is_humanized` to `true`
- AND the system MUST update `humanized_at` to the current timestamp

## Success Criteria
- "Humanize" button is always clickable.
- Subsequent humanization runs overwrite previous ones.
- `humanized_at` timestamp is updated in the database.
