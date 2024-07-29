const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userFollowSchema = new Schema({
  follower: {  //this is sender kon follow ker rha he
    type: Schema.Types.ObjectId,
    ref: 'user', // Reference to the User schema
    required: true,
  },
  following: {   //this is receiver kis ko follow ker rha he 
    type: Schema.Types.ObjectId,
    ref: 'user', // Reference to the User schema
    required: true,
  },
},{ timestamps: true });

const UserFollow = mongoose.model('UserFollow', userFollowSchema);

module.exports = UserFollow;
