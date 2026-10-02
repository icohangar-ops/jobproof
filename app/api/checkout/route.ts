import { NextResponse } from "next/server";

function priceFor(plan: string) {
  if (plan === "lifetime") return process.env.STRIPE_PRICE_LIFETIME;
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO;
  return undefined;
}

function checkoutConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO && process.env.STRIPE_PRICE_LIFETIME);
}

export async function GET() {
  return NextResponse.json({ configured: checkoutConfigured() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { plan?: string };
  const plan = body.plan === "lifetime" ? "lifetime" : body.plan === "pro" ? "pro" : null;
  if (!plan) {
    return NextResponse.json({ status: "invalid_plan" }, { status: 400 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const price = priceFor(plan);
  if (!secret || !price) {
    return NextResponse.json({ status: "coming_soon", plan });
  }

  const stripeModule = await import("stripe");
  const stripe = new stripeModule.default(secret);
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: plan === "lifetime" ? "payment" : "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${origin}/jobs?checkout=success`,
    cancel_url: `${origin}/?checkout=cancelled`,
  });

  return NextResponse.json({ status: "ok", url: session.url });
}
