"use strict";
const mongoose = require("mongoose");
const { Schema } = mongoose;
const reactionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
        type: String,
        enum: ["like", "love", "laugh", "angry", "sad"],
        required: true,
    },
}, { _id: false });
const commentSchema = new Schema({
    eventId: {
        type: Schema.Types.ObjectId,
        ref: "Event",
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    parentId: {
        type: Schema.Types.ObjectId,
        ref: "Comment",
        default: null,
    },
    depth: {
        type: Number,
        default: 0,
    },
    // 👍 Réactions
    reactions: [reactionSchema],
    // 🗑️ Soft delete si besoin
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
module.exports = mongoose.model("Comment", commentSchema);
