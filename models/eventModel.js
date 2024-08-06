// models\eventModel.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    title: {
      type: String,
      required: false,
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
        enum: ["virtual", "in-person"],
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
        type: Schema.Types.ObjectId,
        ref: "user",
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
    allUploadPhotoVideo: {
      type: Number,
      enum: [0, 1], // 0 means not allow 1 means allow
      default: 0,
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
          question: String,
          answer: String,
          required: Boolean,
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

// Exemple de création d'événement
// {
//   "title": "Sample Event",
//   "eventType": "public",
//   "details": {
//     "name": "Sample Event Name",
//     "video": "sample_video_url",
//     "thumbnailVideo": "sample_thumbnail_url",
//     "images": ["image_url1", "image_url2"],
//     "loc": {
//       "type": "Point",
//       "coordinates": [12.9715987, 77.594566],
//     },
//     "mode": "virtual",
//     "location": "Virtual Location",
//     "longitude": "13.0827",
//     "latitude": "80.2707",
//     "date": "2023-08-30",
//     "endDate": "2023-09-01",
//     "startTime": "10:00 AM",
//     "endTime": "12:00 PM",
//     "timeSlots": [
//       { "date": "2023-08-30", "startTime": "10:00 AM", "endTime": "12:00 PM" },
//       { "date": "2023-08-31", "startTime": "11:00 AM", "endTime": "01:00 PM" }
//     ],
//     "description": "Description of the event",
//     "includeChat": true,
//     "createRSVP": true,
//     "tages": "tag1, tag2",
//     "URLlink": "http://eventlink.com"
//   },
//   "interest": ["648c4cf7b32cc57b9ee15f0d"],
//   "privateEventLink": "http://privatelink.com",
//   "coHosts": ["user_id1", "user_id2"],
//   "guests": ["guest_id1", "guest_id2"],
//   "guestsAllowFriend": true
// }
