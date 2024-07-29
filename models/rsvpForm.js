// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const rsvpFormSchema = new Schema({
//   name: {
//     type: String,
//     required: false 
//   },
//   firstName:{
//     type:String
//   },
//   lastName:{
//     type:String
//   },
//   email: {
//     type: String,
//     required: false
//   },
//   phone: String,
//   attendEvent:String,
//   questions: [
//     {
//       question: String,
//       answer: String,
//       options: [String]
//     }
//   ],
//   // additionalField: String
//   additionalField: Schema.Types.Mixed
// },{ timestamps: true });

// const RSVPForm = mongoose.model('RSVPForm', rsvpFormSchema);

// module.exports = RSVPForm;


// {
//   "eventId":"64df65b26135b146ec97453f",
//   "questions": [
//     {
//       "question": "What's your favorite color?",
//       "answer": "",
//       "options": ["Red", "Blue", "Green"]
//     },
//     {
//       "question": "What's your favorite color?",
//       "answer": "",
//       "options": ["Red", "Blue", "Green"]
//     }
//   ],
//   "additionalField": [
//     {
//       "name": "PhoneNumber",
//       "required": true
//     },
//     {
//       "name": "DOB",
//       "required": false
//     }
//   ]
// }


// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const rsvpAnswerSchema = new Schema({
//   question: String,
//   answer: String,
// });

// const additionalFieldAnswerSchema = new Schema({
//   name: String,
//   value: String,
// });

// const rsvpSubmissionSchema = new Schema({
//   eventId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Event', // Reference to the Event schema
//     required: true,
//   },
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User', // Reference to the User schema
//     required: true,
//   },
//   name: String,         // Answer for "name"
//   email: String,        // Answer for "email"
//   firstName: String,    // Answer for "firstName"
//   lastName: String,     // Answer for "lastName"
//   rsvpAnswers: [rsvpAnswerSchema],
//   additionalFieldAnswers: [additionalFieldAnswerSchema],
// });

// const RSVPSubmission = mongoose.model('RSVPSubmission', rsvpSubmissionSchema);

// module.exports = RSVPSubmission;

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
