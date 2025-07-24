import { RequestHandler } from "express";
import Stripe from "stripe";
import { StripeAccount } from "../../models/stripeAccount";

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: "2025-06-30.basil",
});

export const webhookHandler: RequestHandler = async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const body = req.body; // doit être RAW

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
    return; // ✅ pas de return res
  }

  console.log("📡 Stripe Webhook reçu :", event.type);

  try {
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        console.log("🔄 Account updated:", {
          id: account.id,
          details_submitted: account.details_submitted,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
        });

        await StripeAccount.findOneAndUpdate(
          { accountId: account.id },
          {
            detailsSubmitted: account.details_submitted,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            lastSync: new Date(),
          },
        );
        break;
      }

      case "capability.updated": {
        const capability = event.data.object as Stripe.Capability;
        console.log("🔄 Capability updated:", capability);
        break;
      }

      case "account.external_account.created":
      case "account.external_account.updated":
        console.log("🔄 External bank account updated", event.data.object);
        break;

      case "checkout.session.completed":
        console.log("✅ Payment completed");
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("🔥 Error processing webhook:", err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};
