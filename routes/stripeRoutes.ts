import express, { raw } from "express";
import { createOrResumeStripeOnboarding } from "../controller/stripe/create";
import { deleteStripeAccountController } from "../controller/stripe/delete";
import { webhookHandler } from "../controller/stripe/webhook";
import { authenticateJWT } from "../middleware/authentication";

const router = express.Router();

router.post("/webhook", raw({ type: "application/json" }), webhookHandler);

router.get("/webhook/check", (_, res) => {
  res.status(200).json({ ok: true });
});

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

export default router;
