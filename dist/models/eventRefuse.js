"use strict";
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const eventRefuseSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "user" },
    eventId: { type: Schema.Types.ObjectId, ref: "Event" },
    refused: {
        type: Number,
        enum: [0, 1], //0 means not favourite 1 means favourite
        default: 0,
    },
    reason: { type: String, default: "" }, // Optional field to capture the reason for refusal
}, { timestamps: true });
module.exports = mongoose.model("EventRefuse", eventRefuseSchema);
