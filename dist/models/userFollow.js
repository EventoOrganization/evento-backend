"use strict";
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userFollowSchema = new Schema({
    follower: {
        type: Schema.Types.ObjectId,
        ref: 'user', // Reference to the User schema
        required: true,
    },
    following: {
        type: Schema.Types.ObjectId,
        ref: 'user', // Reference to the User schema
        required: true,
    },
}, { timestamps: true });
const UserFollow = mongoose.model('UserFollow', userFollowSchema);
module.exports = UserFollow;
