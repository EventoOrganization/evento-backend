import { RequestHandler } from "express";
import Stripe from "stripe";
const Event = require("../../models/eventModel");

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: "2025-07-30.basil",
});

export const createCheckoutSession: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  console.log("Creating checkout session");
  const { eventId, quantity } = req.body;
  const event = await Event.findById(eventId);
  if (!event || !event.ticketing?.enabled) {
    res.status(400).json({ message: "Ticketing unavailable" });
    return;
  }

  const amount = event.ticketing.price * quantity;
  const feeRate = parseFloat(process.env.PLATEFORM_FEE_RATE || "0");
  const clientUrl = process.env.CLIENT_URL || "";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: event.ticketing.currency,
          product_data: { name: `Ticket for ${event.title}` },
          unit_amount: event.ticketing.price,
        },
        quantity,
      },
    ],
    mode: "payment",
    payment_intent_data: {
      application_fee_amount: Math.round(amount * feeRate),
      transfer_data: {
        destination: event.ticketing.payoutStripeAccountId!,
      },
    },
    success_url: `${clientUrl}/events/${eventId}/buy-ticket`,
    cancel_url: `${clientUrl}/events/${eventId}`,
    metadata: {
      eventId,
      buyerId: req.user?._id?.toString() ?? "",
      quantity: String(quantity),
    },
  } as Stripe.Checkout.SessionCreateParams);
  console.log("session", session);
  res.json({ sessionUrl: session.url });
  return;
};
