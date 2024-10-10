const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventStatusSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    status: {
      type: String,
      enum: ["isGoing", "isFavourite", "isRefused"], // Un seul statut à la fois
      required: true,
    },
    reason: { type: String, default: "" }, // Optionnel pour le statut 'refused'
    rsvpAnswers: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: "Question" },
        answer: { type: [String] },
      },
    ], // Optionnel pour le statut 'going'
  },
  { timestamps: true },
);

module.exports = mongoose.model("EventStatus", eventStatusSchema);
