const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const socketUserSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  socketId: {
    type: String,
    required: true,
  },
  status: {
    type: Number,
    required: true,
  },
},{ timestamps: true });

const SocketUser = mongoose.model('SocketUser', socketUserSchema);

module.exports = SocketUser;
