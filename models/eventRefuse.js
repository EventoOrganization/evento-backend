const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventRefuseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    reason: { type: String, default: "" }, // Optional field to capture the reason for refusal
  },
  { timestamps: true },
);

module.exports = mongoose.model("EventRefuse", eventRefuseSchema);
