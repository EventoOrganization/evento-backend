import express, { raw } from "express";
import { getStripeAccountStatus } from "../controller/stripe/connect";
import { webhookHandler } from "../controller/stripe/webhook";
import { authenticateJWT } from "../middleware/authentication";
import { createOrResumeStripeOnboarding } from "../controller/stripe/create";

const router = express.Router();

router.post("/webhook", raw({ type: "application/json" }), webhookHandler);

router.get("/webhook/check", (_, res) => {
  res.status(200).json({ ok: true });
});

router.get("/me/stripe-account", authenticateJWT, getStripeAccountStatus);
router.post(
  "/me/stripe-account",
  authenticateJWT,
  createOrResumeStripeOnboarding,
);
export default router;
