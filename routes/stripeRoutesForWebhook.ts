import express, { raw } from "express";
import { webhookHandler } from "../controller/stripe/webhook";

const router = express.Router();

// Trigger by Stripe not by user
router.post("/", raw({ type: "application/json" }), webhookHandler);
router.get("/check", (_, res) => {
  router.get("/check", (_, res) => {
    res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      platformSecret: !!process.env.STRIPE_WEBHOOK_SECRET_PLATFORM
        ? "configured"
        : "missing",
      connectSecret: !!process.env.STRIPE_WEBHOOK_SECRET_CONNECT
        ? "configured"
        : "missing",
    });
  });
});

export default router;
