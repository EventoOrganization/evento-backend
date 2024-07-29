const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const eventSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  title: {
    type: String,
    required: false
  },
  eventType: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  details: {
    name: String,
    video: String,
    thumbnailVideo:String,
    images: [String],
    loc:{
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere', // Create a geospatial index for coordinates
        default:[0,0],
        required: false, // Set required to false
      },
    },
    mode: {
      type: String,
      enum: ['virtual', 'in-person']
    },
    location: {type:String,required:false},
    longitude: {type:String,required:false},
    latitude: {type:String,required:false},
    date: {
      type: Date,
      required: false
    },
    endDate: {
      type: Date,
      required: false
    },
    startTime: String,
    endTime: String,
    description: String,
    includeChat: Boolean,
    createRSVP:Boolean,
    tages:String,
    URLlink:String
  },
  interest: [{
    type:mongoose.Schema.Types.ObjectId,
  
    ref: "interest",
  }],
  privateEventLink: String,
  // rsvpForm: {
  //   type: Schema.Types.ObjectId,
  //   ref: 'RSVPForm'
  // },
  coHosts: [{
    type: Schema.Types.ObjectId,
    ref: 'user'
  }],
  guests: [{
    type: Schema.Types.ObjectId,
    ref: 'user'
  }],
  guestsCohostAdd: [{
    type: Schema.Types.ObjectId,
    ref: 'user'
  }],
  allUploadPhotoVideo:{
    type:Number,
    enum:[0,1],   //0 means not allow 1 means allow
    default:0
  },
  rsvpForm:{
    name: {
      type: String,
      required: false 
    },
    firstName:{
      type:String
    },
    lastName:{
      type:String
    },
    email: {
      type: String,
      required: false
    },
    phone: String,
    attendEvent:String,
    questions: [
      {
        question: String,
        answer: String,
        required:Boolean,
        options: [String]
      }
    ],
    // additionalField: String
    additionalField: Schema.Types.Mixed
  },
  coHostStatus:{type:Boolean, default:false},
  guestsAllowFriend:Boolean
},{ timestamps: true });

eventSchema.index({ "details.loc": '2dsphere' });
const Event = mongoose.model('Event', eventSchema);
module.exports = Event;

//create event
// {
  // "title": "Sample Event",
  // "eventType": "public",
  // "name": "Sample Event Name",
  // "video": [], 
  // "images": [], 
  // "mode": "virtual",
  // "location": "Virtual Location",
  // "latitude":"13.0827",
  // "longitude":"80.2707",
  // "date": "2023-08-30",
  // "startTime": "10:00 AM",
  // "endTime": "12:00 PM",
  // "tages":"",
  // "URLlink":"",
  // "description": "Description of the event",
  // "includeChat": true,
  // "createRSVP": true,
  // "interestId": ["648c4cf7b32cc57b9ee15f0d"],
  // "privateEventLink": "http://privatelink.com",
  // "coHosts": [],
  // "guests": [],
  // "guestsAllowFriend":true
// }