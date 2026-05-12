# 09-Real-Time SEO Density Specification

## Purpose
The Real-Time SEO Density system provides immediate feedback to users during the content creation process. It analyzes keyword frequency and density within the editor to ensure content aligns with SEO strategies without requiring manual audits or external processing.

## Requirements

### Requirement: real-time-keyword-counting

The system MUST count the occurrences of the primary keyword and LSI keywords in the current editor text.

#### Scenario: Real-time update with debounce
- GIVEN the editor contains "SEO content"
- AND the primary keyword is "SEO"
- WHEN the user types " is king."
- THEN the system SHALL wait for a 500ms debounce period
- AND the keyword count MUST be updated.

#### Scenario: Case-insensitivity and punctuation ignore
- GIVEN the primary keyword is "Nous"
- WHEN the editor text is "nous, NOUS! Nous."
- THEN the system MUST count 3 occurrences of "Nous"
- AND the system SHALL ignore punctuation attached to the keywords.

### Requirement: seo-pulse-widget

The system MUST show a compact list of keywords with their current optimization status (Gris, Verde, or Rojo).

#### Scenario: Density calculation for status
- GIVEN a total word count of 200
- AND a keyword "AI" with 2 occurrences (1%)
- WHEN the SEO Pulse Widget renders
- THEN the status for "AI" SHALL be "Verde"
- AND the visual indicator MUST be Green.

#### Scenario: Over-optimization detection
- GIVEN a total word count of 100
- AND a keyword "SEO" with 3 occurrences (3%)
- WHEN the SEO Pulse Widget renders
- THEN the status for "SEO" SHALL be "Rojo"
- AND the visual indicator MUST be Red.

#### Scenario: Under-optimization or missing keywords
- GIVEN a keyword "LSI" with 0 occurrences
- WHEN the SEO Pulse Widget renders
- THEN the status for "LSI" SHALL be "Gris"
- AND the visual indicator MUST be Gray.

### Requirement: seo-article-health-bar

The system SHOULD show a general progress bar representing the "Article Health".

#### Scenario: Health bar calculation
- GIVEN 10 keywords defined in the strategy
- AND 5 keywords are in "Verde" state
- WHEN the health bar renders
- THEN it SHALL show 50% coverage.

## Density Limits Reference

The status SHALL be calculated based on the formula: `(count / total_words) * 100`.

| State | Density Range | Color | Logic |
|-------|---------------|-------|-------|
| **Gris** | < 0.5% | Gray | Under-optimized or not present |
| **Verde** | 0.5% - 2.5% | Green | Optimal density |
| **Rojo** | > 2.5% | Red | Over-optimized (Keyword Stuffing risk) |
