## ADDED Requirements

### Requirement: Persist the proof decision aid
The system SHALL store the proof decision aid on the job in on-device storage. The stored aid SHALL include the 1–5 completeness score, the probability that the set is enough for a customer proof PDF, each photo's role probabilities, and the same-site probability when that question was asked. The aid SHALL be computed from text and photo metadata. The system SHALL NOT send image bytes to the decision service.

#### Scenario: Photos and a note
- **WHEN** a job has photo metadata and a note
- **THEN** the job record keeps the aid probabilities for that state

#### Scenario: No API key
- **WHEN** the aid runs without a Jev API key
- **THEN** the stored aid is marked as a local heuristic and is not described as a calibrated score
