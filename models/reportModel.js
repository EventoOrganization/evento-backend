const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema({
  senderId: {
    type: Schema.Types.ObjectId,//who do report
    required: true,
    ref: "user",
  },
  reciverId: {
    type: Schema.Types.ObjectId, //Whome get report
    required: true,
    ref: "user",
  },
  message: {
    type: String,
    required: true,
  },
},{ timestamps: true });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
