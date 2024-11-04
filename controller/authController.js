// controller/user/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Models = require("../models");
const crypto = require("crypto");
const { JWT_SECRET_KEY } = process.env;
const { sendOTPEmail } = require("../helper/emailService");
const { token } = require("morgan");
exports.signup = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already in use." });
    }
    const tempGuest = await Models.tempGuestModel.findOne({ email });
    // Generates a random 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000);
    const otpExpires = Date.now() + 10 * 60 * 1000;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      password: hashedPassword,
      email_otp: otpCode,
      otpExpires: otpExpires,
    });
    await newUser.save();
    if (tempGuest) {
      tempGuest.status = "registered";
      tempGuest.registeredAt = Date.now();
      tempGuest.convertedBy = tempGuest.invitations[0]?.invitedBy || null;
      await tempGuest.save();
      await Models.eventModel.updateMany(
        { "tempGuests._id": tempGuest._id },
        {
          $pull: { tempGuests: { _id: tempGuest._id } },
          $push: { guests: newUser._id },
        },
      );
    }
    // Sends OTP via email
    await sendOTPEmail(email, otpCode);

    res.status(201).json({
      message: "User created successfully",
      body: {
        _id: newUser._id,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
exports.verifyEmailOTP = async (req, res) => {
  const { otpCode } = req.body;

  try {
    const user = await User.findOne({
      email_otp: otpCode,
      otpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    user.email_verified = true;
    user.email_otp = null;
    user.otpExpires = null;
    await user.save();

    return res.status(200).json({
      message: "Email verified successfully.",
      body: { _id: user._id, email: user.email },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Recherche de l'utilisateur par email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Vérification du mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    // Génération du token JWT
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        email: user.email,
      },
      JWT_SECRET_KEY,
      { expiresIn: "30d" },
    );

    // Configuration du cookie sécurisé avec le token
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // secure en production
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 jours
    });
    console.log("Login successful", user);
    res.status(200).json({
      message: "Login successful",
      body: {
        _id: user._id,
        username: user.username,
        profileImage: user.profileImage,
        email: user.email,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({
      message: "Logout successful",
      body: { message: "Logout successful" },
    });
  } catch (error) {
    res.status(500).json({ message: "Logout error", error });
  }
};
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const otpCode = Math.floor(100000 + Math.random() * 900000);
    const otpExpires = Date.now() + 10 * 60 * 1000;

    user.email_otp = otpCode;
    user.otpExpires = otpExpires;
    await user.save();

    await sendOTPEmail(email, otpCode);

    return res.status(200).json({
      message: "OTP sent to your email. Please check your inbox.",
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
exports.verifyOTP = async (req, res) => {
  const { otpCode, flowType } = req.body;

  try {
    // Find user by OTP and check expiration
    const user = await User.findOne({
      email_otp: otpCode,
      otpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid OTP or expired" });
    }

    // Handle different types of verification
    switch (flowType) {
      case "signup":
        user.email_verified = true;
        break;
      case "forgot-password":
        const resetPasswordToken = crypto.randomBytes(20).toString("hex");
        user.resetPasswordToken = resetPasswordToken;
        user.resetPasswordExpires = Date.now() + 3600000;
        break;
      default:
        return res.status(400).json({ message: "Invalid verification type" });
    }

    // Clear OTP and expiration
    user.email_otp = null;
    user.otpExpires = null;

    // Save the user after verification
    await user.save();

    return res.status(200).json({
      message: `${
        flowType.charAt(0).toUpperCase() + flowType.slice(1)
      } verified successfully.`,
      body: {
        _id: user._id,
        email: user.email,
        token: user.resetPasswordToken,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
exports.resetPassword = async (req, res) => {
  const { password, token } = req.body; // Receive the token here

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Ensure token is still valid
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword; // Set the new password (ensure it is hashed)
    user.resetPasswordToken = null; // Clear the token
    user.resetPasswordExpires = null; // Clear the expiration

    await user.save();

    return res
      .status(200)
      .json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res
      .status(500)
      .json({ message: "Server error during password reset" });
  }
};
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete associated records
    await Promise.all([
      Models.eventAttendesUserModel
        ? Models.eventAttendesUserModel.deleteMany({ userId })
        : console.error("eventAttendesUserModel is undefined"),

      Models.eventFavouriteUserModel
        ? Models.eventFavouriteUserModel.deleteMany({ userId })
        : console.error("eventFavouriteUserModel is undefined"),

      Models.eventRefuseModel
        ? Models.eventRefuseModel.deleteMany({ userId })
        : console.error("eventRefuseModel is undefined"),

      Models.coHostModel
        ? Models.coHostModel.deleteMany({ userId })
        : console.error("coHostModel is undefined"),

      Models.userSocialLinkModel
        ? Models.userSocialLinkModel.deleteMany({ userId })
        : console.error("userSocialLinkModel is undefined"),

      Models.userSessionModel
        ? Models.userSessionModel.deleteMany({ userId })
        : console.error("userSessionModel is undefined"),

      Models.userMessageModel
        ? Models.userMessageModel.deleteMany({ userId })
        : console.error("userMessageModel is undefined"),
    ]);

    // Delete the user from the database
    await User.findByIdAndDelete(userId);

    // Clear the user session
    res.clearCookie("token");

    return res
      .status(200)
      .json({ message: "Account and related data deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    return res
      .status(500)
      .json({ message: "Server error, unable to delete account" });
  }
};
