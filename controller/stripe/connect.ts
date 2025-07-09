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

export const createStripeAccount = async (req: Request, res: Response) => {
  const user = req.user;

  const account = await stripe.accounts.create({
    type: "express",
    email: user?.email,
    capabilities: {
      transfers: { requested: true },
    },
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.CLIENT_URL}/onboarding/refresh`,
    return_url: `${process.env.CLIENT_URL}/onboarding/complete`,
    type: "account_onboarding",
  });

  // 💾 Enregistre account.id → user.stripeAccountId en DB
  // await updateUserStripeAccountId(user.id, account.id);

  res.json({ onboardingUrl: accountLink.url });
};
