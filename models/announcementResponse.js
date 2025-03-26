const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const announcementResponseSchema = new Schema(
  {
    announcementId: {
      type: Schema.Types.ObjectId,
      ref: "EventAnnouncement",
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    answers: [
      {
        questionId: { type: Schema.Types.ObjectId, required: true },
        answer: Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "AnnouncementResponse",
  announcementResponseSchema,
);
