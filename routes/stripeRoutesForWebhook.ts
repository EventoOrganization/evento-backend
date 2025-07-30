import express, { raw } from "express";
import { webhookHandler } from "../controller/stripe/webhook";

const router = express.Router();

// Trigger by Stripe not by user
router.post("/", raw({ type: "application/json" }), webhookHandler);
router.get("/check", (_, res) => {
  res.status(200).json({ ok: true });
});

export default router;
