const { Schema, model, Types } = require("mongoose");

const ConversationSchema = new Schema(
  {
    participants: [{ type: Types.ObjectId, ref: "user", required: true }],
    event: {
      type: Types.ObjectId,
      ref: "Event",
      required: false, // optionnel
      default: null,
    },
    title: {
      type: String,
      required: false, // optionnel
      default: null,
    },
    lastMessage: {
      type: Types.ObjectId,
      ref: "Message",
      required: false, // optionnel
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = model("Conversation", ConversationSchema);
