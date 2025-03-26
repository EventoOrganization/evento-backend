const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String }, // facultatif si questionnaire
  answers: [
    {
      questionId: { type: Schema.Types.ObjectId },
      answer: [String], // ou String si type text
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const questionSchema = new Schema({
  question: { type: String, required: true },
  type: { type: String, enum: ["text", "multiple-choice"], default: "text" },
  options: {
    type: [String],
    default: [],
  },
  displayType: {
    type: String,
    enum: ["radio", "checkbox", ""],
    default: "",
  },
});

const eventAnnouncementsSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "questionnaire"],
      default: "info",
    },
    questions: [questionSchema], // facultatif si type === 'info'
    receivers: {
      userIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
      status: { type: String, enum: ["going", "invited", "decline"] },
    },
    comments: [commentSchema], // sert aussi à stocker les réponses
  },
  { timestamps: true },
);

module.exports = mongoose.model("EventAnnouncement", eventAnnouncementsSchema);
