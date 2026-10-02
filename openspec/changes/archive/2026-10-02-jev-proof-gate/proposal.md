## Why

JobProof already turns before photos, after photos, and a note into a customer PDF. That handoff is a decision, and Jev (TypeSafe System One) is a text decision API with calibrated probabilities. The photos stay on the device. Jev should only suggest whether the proof looks complete enough to send, and soft-block that send only when it is explicitly the primary aid.

## What Changes

- Add a Choice / Score / Noul client that posts photo and note metadata to `https://thejevai.com/v1/systemone`, with a deterministic heuristic when no API key is set or the call fails.
- Store the probabilities on the job. Show Before, After, and Needs more badges, and a decision aid with calibrated confidence when Jev answered.
- Default authority stays with the contractor. `JEV_DUAL_RUN=1` logs the aid and keeps the PDF available. `JEV_PRIMARY=1` lets a high-confidence completeness score under 3 pause the PDF until Override. Confidence below 0.70 also waits for a person.
- Badge a thin or overridden PDF. Do not describe the aid as a safety or medical determination.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `jobs`: The job record stores the decision-aid probabilities.
- `proof-report`: PDF generation shows the aid and, when Jev is primary, pauses for a thin or low-confidence proof until the contractor overrides.

## Impact

- `lib/jev` adds the client, parser, heuristic, and gate. `app/api/jev` calls it so the API key stays on the server.
- The job object gains `proofAid`. A thin PDF gains a decision-aid line.
- New env vars: `JEV_API_KEY`, `TYPESAFE_API_KEY`, `JEV_DUAL_RUN`, `JEV_PRIMARY`, `JEV_MODEL`.
- No new paid dependency. A configured key bills about $0.042 per million input tokens.
