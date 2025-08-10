import { Request, Response } from "express";
import Stripe from "stripe";
import { updateUserStripeAccount } from "../../services/stripe/stripeUserService";

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: "2025-07-30.basil",
});

export const createOrResumeStripeOnboarding = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const selectedCountry = req.body.country || user?.stripe?.country || "US";

  if (!user) {
    console.error("❌ [Stripe] No user in request → Unauthorized");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  console.log("🔍 [Stripe] Onboarding check for user:", {
    userId: user._id,
    email: user.email,
    country: selectedCountry,
    stripe: user.stripe ?? null,
  });

  try {
    let accountId = user.stripe?.accountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: selectedCountry,
        email: user.email,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
      });

      accountId = account.id;

      await updateUserStripeAccount(user._id, selectedCountry, {
        accountId: account.id,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        lastSync: new Date(),
      });

      console.log("✅ [Stripe] Created new account:", accountId);
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId!,
      refresh_url: `${process.env.CLIENT_URL}/profile/settings`,
      return_url: `${process.env.CLIENT_URL}/profile/settings/onboarding`,
      type: "account_onboarding",
    });

    console.log("✅ [Stripe] AccountLink generated:", {
      url: accountLink.url,
      expiresAt: accountLink.expires_at,
    });

    res.json({
      onboardingUrl: accountLink.url,
      accountId,
      country: selectedCountry,
    });
  } catch (error: any) {
    console.error("🔥 [Stripe] Error in onboarding:", error.message);
    res.status(500).json({
      error: "Failed to create or resume Stripe onboarding",
      details: error.message,
    });
    return;
  }
};
