"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookHandler = void 0;
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET, {
    apiVersion: "2025-06-30.basil",
});
const webhookHandler = (req, res) => {
    const sig = req.headers["stripe-signature"];
    const body = req.body;
    let event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("❌ Webhook signature failed:", message);
        res.status(400).send(`Webhook Error: ${message}`);
        return;
    }
    console.log("📡 Webhook reçu :", event.type);
    switch (event.type) {
        case "checkout.session.completed":
            console.log("✅ Payment completed");
            break;
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }
    res.status(200).json({ received: true });
};
exports.webhookHandler = webhookHandler;
