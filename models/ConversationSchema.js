const { Schema, model, Types } = require("mongoose");

const ConversationSchema = new Schema(
  {
    participants: [{ type: Types.ObjectId, ref: "user", required: true }],
    eventId: { type: Types.ObjectId, ref: "Event", default: null },
    title: { type: String, default: null }, // if event => event.title
    lastMessage: { type: Types.ObjectId, ref: "Message", default: null },

    readReceipts: { type: Map, of: Types.ObjectId, default: {} }, // to keep track of last read message
    unreadCounts: { type: Map, of: Number, default: {} }, // to keep track of unread messages count
  },
  { timestamps: true },
);

module.exports = model("Conversation", ConversationSchema);
