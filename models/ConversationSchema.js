const { Schema, model, Types } = require("mongoose");

const ConversationSchema = new Schema(
  {
    participants: [{ type: Types.ObjectId, ref: "user", required: true }],
    event: { type: Types.ObjectId, ref: "Event", default: null },
    title: { type: String, default: null }, // if event => event.title
    lastMessage: { type: Types.ObjectId, ref: "Message", default: null },

    readReceipts: {
      type: Map,
      of: Types.ObjectId,
      default: {},
    },
  },
  { timestamps: true },
);

module.exports = model("Conversation", ConversationSchema);
