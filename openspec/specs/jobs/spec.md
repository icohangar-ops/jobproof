# Jobs

Local job book for a solo or micro crew. Records stay on the device in demo mode.

## Requirements

### Requirement: Create a job
The system SHALL create a job from a customer name, an optional address, and a job date, and SHALL show that job in the job book.

#### Scenario: Named customer
- **WHEN** the user submits a customer name and a date
- **THEN** a job is stored on the device with status open and zero photos

#### Scenario: Missing name
- **WHEN** the user submits a blank customer name
- **THEN** the job is not created and the form explains that a name is required

### Requirement: Capture proof on the job
The system SHALL let the user add before photos, after photos, a written note, and an optional microphone recording with a typed transcript field.

#### Scenario: Photo from the library
- **WHEN** the user uploads an image to the before set
- **THEN** the photo is stored with the job and shown on the job screen

#### Scenario: Voice without speech-to-text
- **WHEN** the user records audio
- **THEN** the audio blob is stored on the device and the transcript remains a text field the user edits

### Requirement: Persist the proof decision aid
The system SHALL store the proof decision aid on the job in on-device storage. The stored aid SHALL include the 1–5 completeness score, the probability that the set is enough for a customer proof PDF, each photo's role probabilities, and the same-site probability when that question was asked. The aid SHALL be computed from text and photo metadata. The system SHALL NOT send image bytes to the decision service.

#### Scenario: Photos and a note
- **WHEN** a job has photo metadata and a note
- **THEN** the job record keeps the aid probabilities for that state

#### Scenario: No API key
- **WHEN** the aid runs without a Jev API key
- **THEN** the stored aid is marked as a local heuristic and is not described as a calibrated score
