const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventAttendeeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    attendEvent: {
      type: Number,
      enum: [0, 1], // 0 means not attending, 1 means attending
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("EventAttendee", eventAttendeeSchema);
