import mongoose, { Schema } from "mongoose";

const stripeAccountSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    accountId: { type: String, required: true },
    country: { type: String, required: true },
    detailsSubmitted: { type: Boolean, default: false },
    chargesEnabled: { type: Boolean, default: false },
    payoutsEnabled: { type: Boolean, default: false },
    lastSync: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

stripeAccountSchema.index({ deletedAt: 1 });

export const StripeAccount =
  mongoose.models.StripeAccount ||
  mongoose.model("StripeAccount", stripeAccountSchema);
