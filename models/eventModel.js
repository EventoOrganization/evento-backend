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
    details: {
      name: String,
      video: String,
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
          type: [Number], // [longitude, latitude]
          index: "2dsphere", // Create a geospatial index for coordinates
          default: [0, 0],
          required: false, // Set required to false
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
      startTime: String,
      endTime: String,
      //dufournet franck the 08/06/2024 adding timeSlots
      timeSlots: [
        {
          date: Date,
          startTime: String,
          endTime: String,
        },
      ],
      description: String,
      includeChat: Boolean,
      createRSVP: Boolean,
      tages: String,
      URLlink: String,
    },
    interest: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "interest",
      },
    ],
    privateEventLink: String,
    coHosts: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "user",
        },
        status: {
          type: String,
          enum: ["admin", "read-only"],
          default: "read-only",
        },
      },
    ],
    guests: [
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
    attendees: [
      {
        type: Schema.Types.ObjectId,
        ref: "EventAttendee",
      },
    ],
    allUploadPhotoVideo: {
      type: Boolean,
      default: false,
    },
    rsvpForm: {
      name: {
        type: String,
        required: false,
      },
      firstName: {
        type: String,
      },
      lastName: {
        type: String,
      },
      email: {
        type: String,
        required: false,
      },
      phone: String,
      attendEvent: String,
      questions: [
        {
          question: { type: String, required: true },
          answer: String,
          required: { type: Boolean, default: false },
          options: [String],
        },
      ],
      additionalField: Schema.Types.Mixed,
    },
    coHostStatus: { type: Boolean, default: false },
    guestsAllowFriend: Boolean,
  },
  { timestamps: true },
);

eventSchema.index({ "details.loc": "2dsphere" });

const Event = mongoose.model("Event", eventSchema);
module.exports = Event;
