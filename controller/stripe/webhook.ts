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
  const body = req.body;

  console.log("📡 Stripe Webhook received:", {
    method: req.method,
    url: req.url,
    headers: {
      "stripe-signature": sig ? "present" : "missing",
      "content-type": req.headers["content-type"],
    },
    bodyLength: body ? body.length : 0,
  });

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
    console.error(
      "❌ Webhook secret:",
      process.env.STRIPE_WEBHOOK_SECRET ? "present" : "missing",
    );
    res.status(400).send(`Webhook Error: ${message}`);
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
        console.log("🎫 Quantity in session:", quantity);
        console.log("🧾 Session Metadata:", session.metadata);

        if (!eventId || !buyerId || !paymentIntentId) {
          console.warn(
            "⚠️ Missing metadata or paymentIntent in checkout.session.completed",
          );
          break;
        }

        const eventDoc = await Event.findById(eventId);
        if (!eventDoc) {
          console.error(`❌ Event not found for ID ${eventId}`);
          break;
        }

        const buyer = await User.findById(buyerId);
        if (!buyer) {
          console.error(`❌ Buyer user not found: ${buyerId}`);
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

        console.log(
          `💰 Payment details: ${totalPaid / 100} ${currency?.toUpperCase()}`,
        );
        console.log(
          `🏦 Application fee: ${appFee / 100} ${currency?.toUpperCase()}`,
        );
        console.log(
          `💼 Net revenue for host: ${
            (totalPaid - appFee) / 100
          } ${currency?.toUpperCase()}`,
        );

        // Add ticket
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

        await eventDoc.save(); // Save ticket info first

        // Check status
        const existingStatus = await Models.eventStatusSchema.findOne({
          eventId,
          userId: buyerId,
          status: "isGoing",
        });

        const isFirstPurchase = !eventDoc.soldTickets.some(
          (ticket: SoldTicketsType) => ticket.buyerId.toString() === buyerId,
        );

        console.log(
          `🔍 Buyer already marked as going? ${
            isFirstPurchase ? "❌ No (will create)" : "✅ Yes (skip update)"
          }`,
        );

        let eventStatus = existingStatus;

        if (isFirstPurchase) {
          console.log("🟢 First purchase by buyer. Marking as going.");

          eventStatus = await Models.eventStatusSchema.findOneAndUpdate(
            { eventId, userId: buyerId },
            {
              status: "isGoing",
              rsvpAnswers: [],
              reason: "auto-marked after ticket purchase",
            },
            { new: true, upsert: true, runValidators: true },
          );

          console.log("✅ Buyer marked as going:", eventStatus);
          await updateGoogleSheetForEvent(eventDoc, "updateStatus", {
            eventStatus,
          });
        } else {
          console.log("🔁 Repeat purchase. Buyer already marked as going.");
        }

        // Create temp guests
        const guestsToCreate = isFirstPurchase ? quantity - 1 : quantity;
        const tempGuests: any[] = [];
        const existingTempGuests = await TempGuest.find({
          _id: { $in: eventDoc.tempGuests },
          "invitations.eventId": eventId,
          "invitations.invitedBy": buyerId,
        });

        const existingGuestCount = existingTempGuests.length;
        console.log(
          `👀 Buyer ${buyer.username} already had ${existingGuestCount} temp guests.`,
        );

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

        console.log("🧾 TempGuests IDs added to event:", eventDoc.tempGuests);
        console.log(
          `👥 ${tempGuests.length} TempGuests created for buyer ${buyerId}`,
        );

        if (tempGuests.length > 0) {
          console.log(
            `✅ TempGuests successfully created:`,
            tempGuests.map((g) => ({
              _id: g._id,
              email: g.email,
              username: g.username,
            })),
          );
          await updateGoogleSheetForEvent(eventDoc, "updateGuest");
        } else {
          console.log("ℹ️ No TempGuests created (buyer only)");
        }

        await eventDoc.save(); // Save temp guests added

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
