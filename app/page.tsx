import Link from "next/link";
import { CheckoutButton, CheckoutStatus } from "@/components/checkout-button";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "Open a job",
    body: "Customer name, the address if you have it, and the date. That’s the folder.",
  },
  {
    title: "Shoot before and after",
    body: "Camera or camera roll. Add a written note, or talk for half a minute and type what you said.",
  },
  {
    title: "Hand over the proof",
    body: "A branded PDF, or a link the customer can open. Not an invoice. The record of the work.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" aria-label="JobProof home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <a href="#pricing" className="hidden h-11 items-center rounded-xl px-3 hover:bg-muted sm:inline-flex">
              Pricing
            </a>
            <Button asChild size="lg">
              <Link href="/jobs">Open the job book</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 md:grid-cols-[1.05fr_0.95fr] md:py-20">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary">For solo crews and micro shops</p>
            <h1 className="mt-3 font-display text-5xl leading-[1.02] tracking-tight text-balance md:text-6xl">
              Prove the work. Get paid.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              Before-and-after photos, a short note, and a shareable proof. Coffee money — not a $700 software stack.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/jobs">Start a job</Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <a href="#how">See how it works</a>
              </Button>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
              The demo needs no account and no API keys. Jobs stay in this browser until you clear site data.
            </p>
          </div>
          <ProofCard />
        </section>

        <section id="how" className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title}>
                <p className="font-display text-4xl text-primary">{index + 1}</p>
                <h2 className="mt-2 font-display text-2xl">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="max-w-2xl font-display text-4xl tracking-tight">
            CompanyCam keeps the photos. Jobber runs the shop. JobProof proves the work.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Contractors describe CompanyCam around $99 a month for photos, and Jobber stacks landing between $400 and $700 a month once the add-ons show up. JobProof is the thin wedge: a job, the pictures, the note, the PDF.
          </p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-foreground text-background">
                <tr>
                  <th className="px-4 py-3 font-medium"> </th>
                  <th className="px-4 py-3 font-medium">JobProof</th>
                  <th className="px-4 py-3 font-medium">CompanyCam</th>
                  <th className="px-4 py-3 font-medium">Jobber stack</th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {[
                  ["Price", "$19/mo or $99 once", "About $99/mo for photos", "$400–700/mo reported"],
                  ["Before / after proof PDF", "Yes, with your company name", "Photo library, not a simple proof", "Needs the rest of the suite"],
                  ["Scheduling, quotes, GPS fleet", "No — on purpose", "No", "Yes"],
                  ["Demo without an account", "On this device", "Their cloud", "Their cloud"],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-border">
                    {row.map((cell, index) => (
                      <td key={cell} className={`px-4 py-3 align-top ${index === 0 ? "font-medium" : ""}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="pricing" className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="font-display text-4xl tracking-tight">Coffee money</h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Pro is a monthly seat. Lite is the same proof tools, paid once. Both are the product — not a CRM upsell.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <article className="flex flex-col rounded-3xl bg-foreground p-6 text-background">
                <p className="text-sm font-medium text-[#f0c27a]">Pro</p>
                <p className="mt-3 font-display text-5xl">
                  $19<span className="text-2xl">/mo</span>
                </p>
                <ul className="mt-5 grid flex-1 gap-2 text-sm leading-6 text-background/80">
                  <li>Unlimited jobs on the plan</li>
                  <li>Branded PDF with your company name</li>
                  <li>Share link for the customer</li>
                  <li>Before, after, notes, and a voice memo</li>
                </ul>
                <div className="mt-6">
                  <CheckoutButton plan="pro">Choose Pro</CheckoutButton>
                </div>
              </article>
              <article className="flex flex-col rounded-3xl border border-border bg-background p-6">
                <p className="text-sm font-medium text-primary">Lite</p>
                <p className="mt-3 font-display text-5xl">
                  $99<span className="text-2xl"> once</span>
                </p>
                <ul className="mt-5 grid flex-1 gap-2 text-sm leading-6 text-muted-foreground">
                  <li>Same proof tools as Pro</li>
                  <li>Pay once, keep the workflow</li>
                  <li>Your name on every PDF</li>
                  <li>No scheduling suite hiding in the bill</li>
                </ul>
                <div className="mt-6">
                  <CheckoutButton plan="lifetime" variant="outline">
                    Choose lifetime Lite
                  </CheckoutButton>
                </div>
              </article>
            </div>
            <div className="mt-4">
              <CheckoutStatus />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="font-display text-3xl">Questions from the truck</h2>
          <div className="mt-6 grid gap-3">
            {[
              [
                "Is this a Jobber replacement?",
                "No. There is no schedule, quote engine, or fleet map. If you need a full shop system, this is the wrong tool.",
              ],
              [
                "Where do the photos live?",
                "In this demo they stay in IndexedDB on the device. Clearing site data clears the job book. Export the PDF when the job matters.",
              ],
              [
                "Will my customer open the share link on their phone?",
                "In demo mode, the link opens on the same browser that created it. A hosted account would publish the report. The PDF download works either way.",
              ],
              [
                "Does the mic write the transcript?",
                "The recording is saved on the device. You type the transcript. There is no speech-to-text key in the demo.",
              ],
            ].map(([question, answer]) => (
              <details key={question} className="rounded-2xl border border-border bg-card px-4 py-3">
                <summary className="cursor-pointer text-base font-medium">{question}</summary>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p className="max-w-md text-sm text-muted-foreground">
            Prove the work and get paid — for coffee money.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ProofCard() {
  return (
    <div className="rounded-[28px] bg-foreground p-3 text-background shadow-[0_24px_60px_-32px_rgba(28,22,18,0.7)]">
      <div className="rounded-[22px] bg-[#f7f3ea] p-5 text-foreground">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">Proof of work</p>
          <p className="text-xs text-muted-foreground">Harbor Lane Services</p>
        </div>
        <h2 className="mt-3 font-display text-3xl">Cedar Street kitchen</h2>
        <p className="mt-1 text-sm text-muted-foreground">418 Cedar Street · Backsplash</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="overflow-hidden rounded-xl">
            <div className="grid aspect-[4/3] grid-cols-4 gap-1 bg-[#c9bbaa] p-2">
              {Array.from({ length: 12 }).map((_, index) => (
                <span key={index} className={`rounded-sm ${index === 5 ? "bg-[#6a5142]" : "bg-[#e7ddd0]"}`} />
              ))}
            </div>
            <p className="bg-white px-2 py-1.5 text-xs font-medium">Before</p>
          </div>
          <div className="overflow-hidden rounded-xl">
            <div className="grid aspect-[4/3] grid-cols-4 gap-1 bg-[#f6f2ea] p-2">
              {Array.from({ length: 12 }).map((_, index) => (
                <span key={index} className="rounded-sm bg-white ring-1 ring-[#e3d9cc]" />
              ))}
            </div>
            <p className="bg-white px-2 py-1.5 text-xs font-medium">After</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6">
          Replaced the cracked tile beside the sink and resealed the edge. Silicone needs a day.
        </p>
      </div>
    </div>
  );
}
