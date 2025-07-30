import express from "express";
import { createOrResumeStripeOnboarding } from "../controller/stripe/createOrResumeStripeOnboarding";
import { createCheckoutSession } from "../controller/stripe/createCheckoutSession";
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
