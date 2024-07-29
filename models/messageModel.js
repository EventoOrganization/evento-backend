const mongoose = require('mongoose');
const Schema = mongoose.Schema;
//this is for message store
const messageSchema = new Schema({
  senderId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  reciverId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: false,
  },
  groupUserIds: [{
    type: Schema.Types.ObjectId,
    required: true,
    ref: "user"
  }],
  groupId:{
    type: Schema.Types.ObjectId,
    ref: "groupChat"
  },
  message: {
    type: String,  //type: mongoose.Schema.Types.Mixed, // Allow storing different message types
    required: true,
  },
  message_type: {
    type: String,
    required: true,
  },
  constantId: {
    type: Schema.Types.ObjectId,
    ref: 'ChatConstant',
  },
  is_read: {
    type: Number,
    default: 0,
  },
  groupMessage_read_by:[{
    type: Schema.Types.ObjectId,
    required: true,
    ref: "user"
  }],
  groupMessage_clear:[{
    type: Schema.Types.ObjectId,
    required: true,
    ref: "user"
  }],
  is_delete:{
    type: Schema.Types.ObjectId,
  },
  date:{
    type:String,
  },
  time:{
    type:String
  }
},{ timestamps: true });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
