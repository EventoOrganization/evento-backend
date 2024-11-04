// models\eventModel.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    visibility: {
      type: Boolean,
      default: true,
    },
    details: {
      thumbnailVideo: String,
      images: [String],
      videos: [String],
      loc: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          index: "2dsphere",
          default: [0, 0],
          required: false,
        },
      },
      mode: {
        type: String,
        enum: ["virtual", "in-person", "both"],
      },
      location: { type: String, required: false },
      longitude: { type: String, required: false },
      latitude: { type: String, required: false },
      date: {
        type: Date,
        required: false,
      },
      endDate: {
        type: Date,
        required: false,
      },
      startTime: { type: String },
      endTime: { type: String },
      timeSlots: [
        {
          date: { type: String },
          startTime: { type: String },
          endTime: { type: String },
        },
      ],
      description: { type: String },
      includeChat: Boolean,
      createRSVP: Boolean,
      tages: String,
      URLlink: { type: String },
    },
    initialMedia: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ["image", "video"], required: true },
      },
    ],
    postEventMedia: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ["image", "video"], required: true },
        isThumbnail: { type: Boolean, default: false },
      },
    ],
    interests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "interests",
      },
    ],
    privateEventLink: String,
    coHosts: [
      {
        type: Schema.Types.ObjectId,
        ref: "cohost",
      },
    ],
    guests: [
      {
        type: Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    tempGuests: [
      {
        type: Schema.Types.ObjectId,
        ref: "TempGuest",
      },
    ],
    requested: [
      {
        type: Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    guestsCohostAdd: [
      {
        type: Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    allUploadPhotoVideo: {
      type: Boolean,
      default: false,
    },
    questions: [
      {
        id: { type: String },
        options: [{ type: String }],
        question: { type: String },
        required: { type: Boolean, default: false },
        type: { type: String },
      },
    ],
    coHostStatus: { type: Boolean, default: false },
    guestsAllowFriend: { type: Boolean, default: false },
  },
  { timestamps: true },
);

eventSchema.index({ "details.loc": "2dsphere" });

const Event = mongoose.model("Event", eventSchema);
module.exports = Event;
