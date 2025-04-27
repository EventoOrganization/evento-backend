// models/Message.js
const { Schema, model, Types } = require("mongoose");

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: { type: Types.ObjectId, ref: "user", required: true },
    message: { type: String, required: true },
    messageType: { type: String, default: "text" },
  },
  { timestamps: true },
);

module.exports = model("Message", MessageSchema);
