"use strict";
const mongoose = require("mongoose");
const crypto = require("crypto");
const tempGuestSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    unsubscribeToken: {
        type: String,
        default: () => crypto.randomBytes(32).toString("hex"),
    },
    preferences: {
        receiveEventUpdates: { type: Boolean, default: true },
        receiveReminders: { type: Boolean, default: true },
        receiveInvites: { type: Boolean, default: true },
    },
    invitations: [
        {
            eventId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Event",
                required: true,
            },
            invitedAt: { type: Date, default: Date.now },
            invitedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        },
    ],
    status: {
        type: String,
        enum: ["pending", "registered"],
        default: "pending",
    },
    registeredAt: { type: Date },
    convertedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, { timestamps: true });
const TempGuest = mongoose.model("TempGuest", tempGuestSchema);
module.exports = TempGuest;
