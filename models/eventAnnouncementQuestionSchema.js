// models/event-announcement-question.model.ts

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userAnswerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    answer: { type: [String], required: true }, // always an array (textual or choices)
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const eventAnnouncementQuestionSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    question: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "single-choice", "multiple-choice"],
      required: true,
    },
    options: [{ type: String }],
    answers: [userAnswerSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "EventAnnouncementQuestion",
  eventAnnouncementQuestionSchema,
);
