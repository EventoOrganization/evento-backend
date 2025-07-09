import express, { raw } from "express";
import { webhookHandler } from "../controller/stripe/webhook";

const router = express.Router();

router.post("/webhook", raw({ type: "application/json" }), webhookHandler);

router.get("/webhook/check", (_, res) => {
  res.status(200).json({ ok: true });
});

export default router;
