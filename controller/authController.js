// controller/user/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { JWT_SECRET_KEY } = process.env;
const { sendOTPEmail } = require("../helper/emailService");
exports.signup = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already in use." });
    }
    const tempGuest = await TempGuest.findOne({ email });
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
      return res.status(400).json({ message: "Invalid credentials" });
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
