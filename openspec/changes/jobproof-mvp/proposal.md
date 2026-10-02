# JobProof MVP

## Why
Solo and micro contractors need before/after photos and a note tied to a job, then a proof they can hand a customer. CompanyCam is a photo subscription around $99 a month. Jobber-class stacks are described at $400–700 a month. JobProof is the thin wedge: prove the work and get paid, for coffee money.

## What changes
- Mobile-first Next.js PWA with a local-first demo (IndexedDB, no required secrets)
- Job book: create a job, before/after photos, notes, optional voice memo plus typed transcript
- Branded PDF and a `/share/[token]` page
- Marketing page with Pro $19/mo and Lite $99 lifetime; Stripe Checkout only when env vars exist
- Settings for the company name on the proof

## Non-goals
No scheduling CRM, quoting, invoicing, GPS fleet, or medical claims.

## Impact
New application. Specs: `jobs`, `proof-report`, `marketing`.
