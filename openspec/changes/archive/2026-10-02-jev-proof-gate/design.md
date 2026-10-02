## Context

JobProof stores jobs, photos, and notes in IndexedDB and builds the PDF in the browser. Photos already have a contractor-chosen slot, `before` or `after`. Jev accepts text or JSON state and returns Choice, Score, and Noul answers with probabilities. It does not accept the photo.

## Goals / Non-Goals

**Goals:**

- One System One call per job state with a role Choice per photo, a completeness Score from 1 to 5, a Noul for "enough for a customer proof PDF?", and a same-site Noul only when the address and at least two photos are present.
- Demos and `npm run build` work with no key, using local rules that trust the contractor's slot.
- The UI shows the aid and a calibrated confidence only when Jev actually answered.
- Dual-run logs the aid and keeps the PDF available unless `JEV_PRIMARY=1`.

**Non-Goals:**

- Sending image bytes, running OCR, or turning the voice memo into text.
- Calling OpenRouter's Decisions API. The client posts to thejevai.com.
- Treating the score as a statement that the work is safe or complete to a trade standard.

## Decisions

1. The browser posts metadata to `app/api/jev`. The route calls `lib/jev` with the server env, so `JEV_API_KEY` is not bundled into the client. If that request fails, the screen uses the same heuristic and does not pause the PDF.
2. No key, or any request or parse failure, produces `source: "heuristic"` and `calibrated: false`. `JEV_PRIMARY` does not let that heuristic pause the PDF.
3. The System One score is the 0-based index of a five-level rubric. The product score is that index plus one, clamped to 1–5. The soft-block compares the product score to 3.
4. When `JEV_PRIMARY=1` and the source is Jev, score confidence below 0.70 pauses the PDF for a person. Confidence at or above 0.70 pauses it only when the product score is under 3. Override adds a line to the PDF.
5. The model id defaults to `jev-1.13.0`. `JEV_API_KEY` wins over `TYPESAFE_API_KEY`. One retry on HTTP 429 or 529, then the heuristic.
6. The aid is a card on the job, labeled "Decision aid". Heuristic copy says it is not a calibrated model score. Photo badges use the role. The job header shows Needs more when the score is under 3.
7. Probabilities live on `job.proofAid` in the existing IndexedDB job record. Older jobs simply lack the field.

## Risks / Trade-offs

- A hosted call sees the note, the address, and photo metadata, not the image. The README says so.
- `JEV_PRIMARY` can pause a PDF the contractor would otherwise send. That is opt-in, and Override remains.
- The local rules cannot see the picture, so they echo the before/after slot. They exist so the demo runs, not so they replace a look at the photo.

## Migration Plan

No data migration. Unset keys keep today's PDF path and add the heuristic badges. Set `JEV_DUAL_RUN=1` before `JEV_PRIMARY=1`.

## Open Questions

- None for this change. A later change could add OCR captions to the state once a caption exists on the device.
