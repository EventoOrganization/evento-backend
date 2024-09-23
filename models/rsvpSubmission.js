const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const rsvpAnswerSchema = new Schema({
  questionId: String,
  answer: [String],
});

const additionalFieldAnswerSchema = new Schema({
  name: String,
  value: String,
});

const rsvpSubmissionSchema = new Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event", // Reference to the Event schema
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user", // Reference to the User schema
      required: true,
    },
    name: String, // Answer for "name"
    email: String, // Answer for "email"
    firstName: String, // Answer for "firstName"
    lastName: String, // Answer for "lastName"
    phone: String,
    countryCode: String,
    attendEvent: String,
    rsvpAnswers: [rsvpAnswerSchema],
    additionalFieldAnswers: [additionalFieldAnswerSchema],
  },
  { timestamps: true },
);

const RSVPSubmission = mongoose.model("RSVPSubmission", rsvpSubmissionSchema);

module.exports = RSVPSubmission;

//answer of rsvp form

// {
//   "eventId": "64df65b26135b146ec97453f",
//   "name": "John Doe",
//   "email": "john@example.com",
//   "firstName": "John",
//   "lastName": "Doe",
//   "phone": "1234567890",
//   "questions": [
//     {
//       "question": "What's your favorite color?",
//       "answer": "Blue"
//     },
//     {
//       "question": "What's your favorite food?",
//       "answer": "Pizza"
//     }
//   ],
//   "additionalField": [
//     {
//       "name": "PhoneNumber",
//       "value": "9876543210"
//     },
//     {
//       "name": "DOB",
//       "value": "1990-05-15"
//     }
//   ]
// }
