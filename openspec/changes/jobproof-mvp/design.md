# Design

## Demo storage
IndexedDB (`idb`) holds jobs, photo blobs, voice blobs, company settings, and share snapshots. The share route reads the snapshot by token. It works in the browser that created it. That is the honest demo; a hosted account is out of scope.

## PDF
`jspdf` draws an A4 proof: ink header, company name, customer, notes, transcript, before photos, after photos, page footer that says it is not an invoice. Generation is a pure function so tests can run in Node.

## Photos
Uploads are resized on a canvas to a max edge of 1600px and stored as JPEG. The camera input uses `capture="environment"` beside a library picker.

## Voice
`MediaRecorder` stores a blob. The transcript is a text field. There is no speech-to-text provider in the demo.

## Checkout
`POST /api/checkout` creates a Stripe Checkout session only when `STRIPE_SECRET_KEY` and the price id for the chosen plan are set. Otherwise it returns `coming_soon`.

## PWA
Web app manifest, icons, and a network-first service worker registered in production. The worker falls back to `/offline` for navigations.
