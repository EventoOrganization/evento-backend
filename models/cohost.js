const mongoose = require("mongoose");
let Schema = mongoose.Schema;
const cohostSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    event_id: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    status: {
      type: String,
      enum: ["admin", "read-only"],
      default: "read-only",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("cohost", cohostSchema);
