const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const eventUpdateSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "Event" },
});
module.exports = mongoose.model("EventUpdate", eventUpdateSchema);
