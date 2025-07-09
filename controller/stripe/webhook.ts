import { Request, Response } from "express";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: "2025-06-30.basil",
});

export const webhookHandler = (req: Request, res: Response): void => {
  const sig = req.headers["stripe-signature"] as string;
  const body = req.body;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("❌ Webhook signature failed:", message);
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  console.log("📡 Webhook reçu :", event.type);

  switch (event.type) {
    case "checkout.session.completed":
      console.log("✅ Payment completed");
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
};
