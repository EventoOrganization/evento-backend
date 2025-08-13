import express from "express";
import { createCheckoutSession } from "../controller/stripe/createCheckoutSession";
import { createOrResumeStripeOnboarding } from "../controller/stripe/createOrResumeStripeOnboarding";
import { deleteStripeAccountController } from "../controller/stripe/delete";
import { authenticateJWT } from "../middleware/authentication";

const router = express.Router();

// Trigger by user
router.post(
  "/me/stripe-account",
  authenticateJWT,
  createOrResumeStripeOnboarding,
);
router.delete(
  "/me/stripe-account/:accountId",
  authenticateJWT,
  deleteStripeAccountController,
);
router.post("/checkout/session", authenticateJWT, createCheckoutSession);
export default router;
