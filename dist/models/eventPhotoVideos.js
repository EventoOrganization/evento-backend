"use strict";
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const eventPhotoVideosSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    eventId: {
        type: Schema.Types.ObjectId,
        ref: 'Event'
    },
    images: [String],
    video: [String],
    thumbnailVideo: [String],
}, { timestamps: true });
const EventPhotoVideos = mongoose.model('EventPhotoVideos', eventPhotoVideosSchema);
module.exports = EventPhotoVideos;
