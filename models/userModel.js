const mongoose = require("mongoose");
const crypto=require('crypto')
const userSchema = new mongoose.Schema({
  firstName: { type: String },
  name: { type: String }, //only for admin
  lastName: { type: String },
  email: { type: String },
  socialId:{type:String},
  socialType:{type:Number},
  password: { type: String },
  countryCode:{type:String},
  phoneNumber: { type: String },
  address:{type:String},
  DOB:{type:String},
  image: { type: String },
  role: {
    type: String,
    enum: ["admin", "user"],
    deafult: "user",
  },
  profileImage: { type: String },//for user 
  deviceToken: { type: String },
  deviceType: { type: String },
  loginTime: { type: Number },
  address:{type:String},
  bio:{type:String},
  countryCode: {
    type: String,
  },
  resetPasswordToken: { type: String, default: null },
  forgotPasswordToken:{type:String,default:null},
  resetPasswordExpires: { type: Date, default: null },
  phone_verified:{type:String},
  aboutMe:{type:String},
  otp:{type:Number},
  is_block:{type:Number,default:0},
  is_otp_verify:{
    type: Number,
    enum: [0, 1],
    deafult: 0,
  },
  interest:[ {
    type:mongoose.Schema.Types.ObjectId,
    ref: "interest",
  },]
},
{ timestamps: true });

userSchema.methods.generateResetPasswordToken = function() {
  const token = crypto.randomBytes(20).toString('hex');
  return token;
};

const user = mongoose.model("user", userSchema);
module.exports = user;
