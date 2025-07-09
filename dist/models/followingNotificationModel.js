"use strict";
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const followingNotificationModel = new Schema({
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
    is_read: {
        type: Number,
        enum: [0, 1], //0 for not read 1 for read
        default: 0
    },
    isBirthday: {
        type: Number,
        enum: [0, 1],
        default: 0
    }
}, { timestamps: true });
const followingNotification = mongoose.model('followingNotificationModel', followingNotificationModel);
module.exports = followingNotification;
