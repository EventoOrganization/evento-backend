"use strict";
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const eventNotificationModel = new Schema({
    senderId: {
        type: Schema.Types.ObjectId,
        ref: 'user', // Reference to the User schema
        required: true,
    },
    reciverId: {
        type: Schema.Types.ObjectId,
        ref: 'user', // Reference to the User schema
        required: true,
    },
    message: {
        type: String
    },
    notificationTo: {
        type: String,
        enum: ["co-host", "guest", "none"],
        default: "none"
    },
    is_read: {
        type: Number,
        enum: [0, 1], //0 for not read 1 for read
        default: 0
    },
    eventId: {
        type: Schema.Types.ObjectId,
        ref: 'Event', // Reference to the User schema
        required: true,
    },
    eventName: {
        type: String
    },
    data: {
        type: String
    },
    startTime: {
        type: String
    },
    endTime: {
        type: String
    },
    location: {
        type: String
    },
    longitude: String,
    latitude: String,
    createRSVP: Boolean
}, { timestamps: true });
const eventNotification = mongoose.model('eventNotificationModel', eventNotificationModel);
module.exports = eventNotification;
