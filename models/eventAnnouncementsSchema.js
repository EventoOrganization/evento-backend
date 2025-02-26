const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const eventAnnouncementsSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    receivers: {
      userIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
      status: { type: String, enum: ["going", "invited", "decline"] },
    },
    comments: [commentSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("EventUpdate", eventAnnouncementsSchema);
