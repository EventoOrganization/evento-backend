const mongoose = require("mongoose");
const crypto = require("crypto");
const userSchema = new mongoose.Schema(
  {
    // standards userInfo
    username: { type: String, default: "Anonymous", trim: true },
    usernameNormalized: {
      type: String,
      default: "anomymous",
      trim: true,
      unique: true,
    },
    firstName: { type: String, default: "", trim: true },
    lastName: { type: String, default: "", trim: true },
    password: { type: String, required: true },
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
      trim: true,
    },
    preferences: {
      receiveEventUpdates: { type: Boolean, default: true },
      receiveReminders: { type: Boolean, default: true },
      receiveInvites: { type: Boolean, default: true },
    },
    email_verified: { type: String, default: false },
    countryCode: { type: String, default: "+" },
    phoneNumber: { type: String, default: "" },
    phone_verified: { type: String, default: false },
    address: { type: String, default: "" },
    bio: { type: String, default: "" },
    URL: { type: String, default: "" },
    DOB: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    loginTime: { type: Number },

    // Fields for password reset
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    forgotPasswordToken: { type: String, default: null },
    otpExpires: { type: Date, default: null },

    // OTP for verification
    email_otp: { type: Number, default: 0 },
    phone_otp: { type: Number, default: 0 },
    is_block: { type: Number, default: 0 },

    // specials userInfo
    pwaNotification: { type: Boolean, default: false },
    pwaSubscriptions: [
      {
        browser: {
          type: String,
          enum: ["chrome", "firefox", "safari", "unknown"],
        },
        endpoint: { type: String }, // Contrôle par l'utilisateur
        keys: {
          p256dh: { type: String },
          auth: { type: String },
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    interests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "interests",
      },
    ],
    socialLinks: [
      {
        platform: {
          type: String,
          enum: [
            "facebook",
            "google",
            "twitter",
            "instagram",
            "linkedin",
            "tiktok",
            "youtube",
            "",
          ],
        },
        url: { type: String, default: "" },
      },
    ],
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    devices: [
      {
        deviceToken: { type: String, required: true },
        deviceType: {
          type: String,
          enum: ["web", "android", "ios"],
          required: true,
        },
        lastUsed: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);
userSchema.index(
  { username: 1 },
  { unique: true, partialFilterExpression: { username: { $ne: "anonymous" } } },
);

const user = mongoose.model("user", userSchema);
module.exports = user;
