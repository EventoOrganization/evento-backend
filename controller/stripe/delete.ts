import { Request, Response } from "express";
import Stripe from "stripe";
import {
  hardDeleteUserStripeAccount,
  softDeleteUserStripeAccount,
} from "../../services/stripe/delete";

const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  apiVersion: "2025-07-30.basil",
});

export const deleteStripeAccountController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const user = req.user;
  const { accountId } = req.params;
  const hard = req.query.hard === "true"; // ✅ check param query

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // ✅ Supprime toujours côté Stripe
    await stripe.accounts.del(accountId);

    if (hard) {
      await hardDeleteUserStripeAccount(user._id, accountId);
      console.log(`🗑️ Hard deleted StripeAccount ${accountId}`);
    } else {
      await softDeleteUserStripeAccount(user._id, accountId);
      console.log(`🗑️ Soft deleted StripeAccount ${accountId}`);
    }

    res.json({ success: true, hard });
  } catch (error: any) {
    console.error("🔥 [Stripe] Error deleting account:", error.message);
    res.status(500).json({
      error: "Failed to delete Stripe account",
      details: error.message,
    });
  }
};
