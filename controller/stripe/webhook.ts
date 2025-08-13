import { RequestHandler } from "express";
import Stripe from "stripe";
import { StripeAccount } from "../../models/stripeAccount";
import { SoldTicketsType } from "../../types/event/soldTickets";
import { updateGoogleSheetForEvent } from "../../utils/googleAppScript";
const Event = require("../../models/eventModel");
const TempGuest = require("../../models/tempGuestModel");
const User = require("../../models/userModel");
const Models = require("../../models");

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: "2025-07-30.basil",
});

export const webhookHandler: RequestHandler = async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const rawBody = req.body;

  console.log("📡 Stripe Webhook received:", {
    method: req.method,
    url: req.url,
    headers: {
      "stripe-signature": sig ? "present" : "missing",
      "content-type": req.headers["content-type"],
    },
  });

  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET_PLATFORM, // checkout.session.completed
    process.env.STRIPE_WEBHOOK_SECRET_CONNECT, // account.updated, capability.updated
  ].filter(Boolean) as string[];

  let event: Stripe.Event | null = null;
  let lastError: any = null;

  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, secret);
      break; // ✅ trouvé, on arrête ici
    } catch (err) {
      lastError = err;
    }
  }

  if (!event) {
    console.error(
      "❌ Webhook signature failed for all secrets:",
      lastError?.message,
    );
    res.status(400).send(`Webhook Error: ${lastError?.message}`);
    return;
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

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const eventId = session.metadata?.eventId;
        const buyerId = session.metadata?.buyerId;
        const quantity = parseInt(session.metadata?.quantity || "1");
        const paymentIntentId = session.payment_intent as string;

        console.log("📦 Stripe checkout.session.completed received");
        console.log("🎫 Quantity:", quantity);
        console.log("🧾 Metadata:", session.metadata);

        if (!eventId || !buyerId || !paymentIntentId) {
          console.warn("⚠️ Missing metadata or paymentIntent");
          break;
        }

        const eventDoc = await Event.findById(eventId);
        if (!eventDoc) {
          console.error(`❌ Event not found for ID ${eventId}`);
          break;
        }

        const buyer = await User.findById(buyerId);
        if (!buyer) {
          console.error(`❌ Buyer not found: ${buyerId}`);
          break;
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(
          paymentIntentId,
          {
            expand: ["latest_charge"],
          },
        );

        const totalPaid = paymentIntent.amount_received;
        const currency = paymentIntent.currency;
        const appFee = paymentIntent.application_fee_amount ?? 0;

        console.log("🧾 PaymentIntent:", {
          id: paymentIntent.id,
          total: totalPaid,
          currency,
          app_fee: appFee,
        });

        eventDoc.soldTickets.push({
          buyerId,
          stripePaymentIntent: paymentIntentId,
          quantity,
        });

        if (
          eventDoc.ticketing.enabled &&
          eventDoc.ticketing.remainingTickets > 0
        ) {
          eventDoc.ticketing.remainingTickets = Math.max(
            eventDoc.ticketing.remainingTickets - quantity,
            0,
          );
        }

        await eventDoc.save();

        const existingStatus = await Models.eventStatusSchema.findOne({
          eventId,
          userId: buyerId,
          status: "isGoing",
        });

        const isFirstPurchase = !eventDoc.soldTickets.some(
          (ticket: SoldTicketsType) => ticket.buyerId.toString() === buyerId,
        );

        if (isFirstPurchase) {
          const eventStatus = await Models.eventStatusSchema.findOneAndUpdate(
            { eventId, userId: buyerId },
            {
              status: "isGoing",
              rsvpAnswers: [],
              reason: "auto-marked after ticket purchase",
            },
            { new: true, upsert: true, runValidators: true },
          );

          await updateGoogleSheetForEvent(eventDoc, "updateStatus", {
            eventStatus,
          });
        }

        const guestsToCreate = isFirstPurchase ? quantity - 1 : quantity;
        const tempGuests: any[] = [];
        const existingTempGuests = await TempGuest.find({
          _id: { $in: eventDoc.tempGuests },
          "invitations.eventId": eventId,
          "invitations.invitedBy": buyerId,
        });

        const existingGuestCount = existingTempGuests.length;

        for (let i = 0; i < guestsToCreate; i++) {
          const guestIndex = existingGuestCount + i + 1;
          const guestUsername = `${buyer.username} +${guestIndex}`;
          const guestEmail = `guest+${crypto.randomUUID()}@ezstart.app`;

          const tempGuest = await TempGuest.create({
            email: guestEmail,
            username: guestUsername,
            invitations: [{ eventId, invitedBy: buyerId }],
          });

          eventDoc.tempGuests.push(tempGuest._id);
          tempGuests.push(tempGuest);
        }

        if (tempGuests.length > 0) {
          await updateGoogleSheetForEvent(eventDoc, "updateGuest");
        }

        await eventDoc.save();
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`, {
          eventId: event.id,
          objectType: event.data.object.object,
        });
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("🔥 Error processing webhook:", err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};
