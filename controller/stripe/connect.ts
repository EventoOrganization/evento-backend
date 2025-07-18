import { Request, RequestHandler, Response } from "express";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: "2025-06-30.basil",
});

export const getStripeAccountStatus: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  const user = req.user;

  if (!user?.stripeAccountId) {
    res.json({ hasStripeAccount: false });
  }

  const account = await stripe.accounts.retrieve(user?.stripeAccountId);

  res.json({
    hasStripeAccount: true,
    chargesEnabled: account.charges_enabled,
    detailsSubmitted: account.details_submitted,
  });
};
