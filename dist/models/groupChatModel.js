"use strict";
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const groupChatSchema = new Schema({
    eventId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "Event"
    },
    admin: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "user"
    },
    users: [{
            type: Schema.Types.ObjectId,
            required: true,
            ref: "user"
        }],
    groupName: {
        type: String,
    },
    image: {
        type: String
    },
    date: {
        type: String,
    },
    time: {
        type: String
    },
}, { timestamps: true });
const groupChat = mongoose.model('groupChat', groupChatSchema);
module.exports = groupChat;
