## ADDED Requirements

### Requirement: Jev proof completeness aid
The system MUST show a decision aid for contractor proof completeness. One evaluation MUST be able to include a photo-role choice of before, after, detail, or irrelevant, a completeness score from 1 to 5, a yes-or-no probability that the set is enough for a customer proof PDF, and, when the job has an address and at least two photos, a yes-or-no probability that the photos look like the same site visit. The aid MUST be labeled as a decision aid, MUST show a calibrated confidence only when Jev answered, and MUST NOT be described as a certainty or as a safety or medical determination. The aid MUST NOT require the photo bytes. When no Jev API key is configured, or the Jev call fails, the system MUST fill the aid from deterministic local rules and MUST keep PDF generation available.

#### Scenario: Demo without a key
- **WHEN** a job is opened without `JEV_API_KEY` and without `TYPESAFE_API_KEY`
- **THEN** the screen shows a decision aid marked as a local heuristic, and Download PDF still runs

#### Scenario: Thin proof is badged
- **WHEN** the completeness score is under 3 and the contractor still generates a PDF
- **THEN** the PDF includes a decision-aid line that states the completeness score and that this is not a safety determination

### Requirement: Optional Jev soft gate
When `JEV_DUAL_RUN` is set and `JEV_PRIMARY` is not set, the system MUST log the aid and MUST keep PDF generation available. When `JEV_PRIMARY` is set and the aid came from Jev with calibrated confidence at or above 0.70, a completeness score under 3 MUST pause PDF generation until the contractor uses Override. When `JEV_PRIMARY` is set and the calibrated confidence is below 0.70, PDF generation MUST wait for that same person to confirm. A missing key or a failed call MUST NOT let `JEV_PRIMARY` pause the PDF. An overridden PDF MUST say that a person confirmed it.

#### Scenario: Dual run keeps the PDF available
- **WHEN** `JEV_DUAL_RUN` is set, `JEV_PRIMARY` is not set, and the aid scores the proof under 3
- **THEN** the log contains the aid and Download PDF still runs

#### Scenario: Primary high confidence soft-block
- **WHEN** `JEV_PRIMARY` is set and Jev returns completeness under 3 with calibrated confidence at or above 0.70
- **THEN** Download PDF stays paused until the contractor uses Override

#### Scenario: Low confidence asks a person
- **WHEN** `JEV_PRIMARY` is set and Jev returns a completeness score with calibrated confidence below 0.70
- **THEN** Download PDF stays paused until a person confirms it

#### Scenario: Missing key does not take over
- **WHEN** `JEV_PRIMARY` is set and no Jev API key is configured
- **THEN** the local heuristic is shown and Download PDF still runs
