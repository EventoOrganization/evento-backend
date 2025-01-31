// controller/user/authController.js
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const helper = require("../helper/helper");
const Models = require("../models");
const crypto = require("crypto");
const { JWT_SECRET_KEY } = process.env;
const { sendOTPEmail } = require("../helper/mailjetEmailService");
const { token } = require("morgan");
exports.quickSignup = async (req, res) => {
  const { username, email } = req.body;

  try {
    // Vérifier si l'email ou le username existe déjà
    const existingUserEmail = await User.findOne({ email });
    if (existingUserEmail) {
      return res.status(409).json({
        status: false,
        message: "You already have an account, please sign in to Respond.",
      });
    }

    const normalizedUsername = username
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .replace(/[^a-z]/g, "");

    const existingUserUsername = await User.findOne({
      usernameNormalized: normalizedUsername,
    });
    if (existingUserUsername) {
      return res.status(409).json({
        status: false,
        message: "Username already exists. Please choose another one.",
      });
    }

    // Génération du mot de passe et des informations d'utilisateur
    const generateRandomPassword = () => {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()";
      const passwordLength = 12;
      let password = "";
      for (let i = 0; i < passwordLength; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        password += chars[randomIndex];
      }
      return password;
    };

    const password = generateRandomPassword();
    const otpCode = Math.floor(100000 + Math.random() * 900000);
    const otpExpires = Date.now() + 10 * 60 * 1000;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Étape 1 : Créer l'utilisateur sans image
    const newUser = new User({
      username,
      usernameNormalized: normalizedUsername,
      email,
      password: hashedPassword,
      email_otp: otpCode,
      otpExpires: otpExpires,
    });
    await newUser.save();

    let profileImage = "";

    // Étape 2 : Upload de l'image si elle existe
    if (req.files && req.files.profileImage) {
      const file = req.files.profileImage;
      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          status: false,
          message: "Only image files are allowed for the profile image",
        });
      }

      try {
        // Utiliser l'ID de l'utilisateur comme chemin
        const userId = newUser._id.toString();
        profileImage = await helper.fileUpload(file, `profile/${userId}`);
        // Étape 3 : Mettre à jour l'utilisateur avec l'URL de l'image
        newUser.profileImage = profileImage;
        await newUser.save();
      } catch (error) {
        console.error("Error uploading profile image:", error);
        return res.status(500).json({
          status: false,
          message: "Error uploading profile image",
          error: error.message,
        });
      }
    }

    // Étape 4 : Si l'utilisateur existait comme tempGuest, le mettre à jour
    const tempGuest = await Models.tempGuestModel.findOne({ email });
    if (tempGuest) {
      tempGuest.status = "registered";
      tempGuest.registeredAt = Date.now();
      tempGuest.convertedBy = tempGuest.invitations[0]?.invitedBy || null;
      await tempGuest.save();

      // Mettre à jour les événements où ce tempGuest était invité
      await Models.eventModel.updateMany(
        { tempGuests: tempGuest._id },
        {
          $push: { guests: newUser._id },
          $pull: { tempGuests: tempGuest._id },
        },
      );
    }

    // Envoi de l'OTP
    await sendOTPEmail(email, otpCode, password);

    // Réponse finale
    res.status(201).json({
      message: "User created successfully",
      body: {
        _id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        profileImage: newUser.profileImage,
        password: password,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create account." });
  }
};
exports.newSignup = async (req, res) => {
  const { email, password, username } = req.body;

  try {
    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already in use." });
    }

    // Vérifier si le username existe déjà
    const normalizedUsername = username
      .toLowerCase()
      .normalize("NFD") // Décompose les caractères accentués (ex: é -> e)
      .replace(/[\u0300-\u036f]/g, "") // Supprimer les diacritiques (accents)
      .replace(/\s+/g, "") // Supprimer tous les espaces
      .replace(/[^a-z]/g, ""); // Supprimer tous les caractères non alphabétiques

    const existingUserUsername = await User.findOne({
      usernameNormalized: normalizedUsername,
    });
    if (existingUserUsername) {
      return res.status(409).json({
        message: "Username already exists. Please choose another one.",
      });
    }

    // Génération de l'OTP et hashage du mot de passe
    const otpCode = Math.floor(100000 + Math.random() * 900000);
    const otpExpires = Date.now() + 10 * 60 * 1000;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Étape 1 : Créer l'utilisateur sans image
    const newUser = new User({
      email,
      password: hashedPassword,
      username,
      usernameNormalized: normalizedUsername,
      email_otp: otpCode,
      otpExpires: otpExpires,
    });
    await newUser.save();

    let profileImage = "";
    // Étape 2 : Upload de l'image si elle existe
    if (req.files && req.files.profileImage) {
      const file = req.files.profileImage;
      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          message: "Only image files are allowed for the profile image",
        });
      }

      try {
        // Utiliser l'ID de l'utilisateur comme chemin
        const userId = newUser._id.toString();
        profileImage = await helper.fileUpload(file, `profile/${userId}`);
        // Étape 3 : Mettre à jour l'utilisateur avec l'URL de l'image
        newUser.profileImage = profileImage;
        await newUser.save();
      } catch (error) {
        console.error("Error uploading profile image:", error);
        return res.status(500).json({
          message: "Error uploading profile image",
          error: error.message,
        });
      }
    }

    // Étape 4 : Si l'utilisateur existait comme tempGuest, le mettre à jour
    const tempGuest = await Models.tempGuestModel.findOne({ email });
    if (tempGuest) {
      tempGuest.status = "registered";
      tempGuest.registeredAt = Date.now();
      tempGuest.convertedBy = tempGuest.invitations[0]?.invitedBy || null;
      await tempGuest.save();

      // Mettre à jour les événements où ce tempGuest était invité
      await Models.eventModel.updateMany(
        { tempGuests: tempGuest._id },
        {
          $push: { guests: newUser._id },
        },
      );
    }

    // Étape 5 : Envoi de l'OTP
    await sendOTPEmail(email, otpCode);

    // Étape 6 : Répondre avec les données utilisateur
    res.status(201).json({
      message: "User created successfully",
      body: {
        _id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        profileImage: newUser.profileImage || "",
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
exports.signup = async (req, res) => {
  const { email, password } = req.body;

  try {
    // console.log("Received signup request for email:", email);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // console.log("Email already in use:", email);
      return res.status(400).json({ message: "Email is already in use." });
    }

    const tempGuest = await Models.tempGuestModel.findOne({ email });
    // console.log("Temp guest found:", tempGuest);

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
    // console.log("New user created with ID:", newUser._id);

    if (tempGuest) {
      // console.log("Updating tempGuest status to 'registered'");
      tempGuest.status = "registered";
      tempGuest.registeredAt = Date.now();
      tempGuest.convertedBy = tempGuest.invitations[0]?.invitedBy || null;
      await tempGuest.save();
      // console.log("Temp guest status updated:", tempGuest);

      const updateResult = await Models.eventModel.updateMany(
        { tempGuests: tempGuest._id },
        {
          $push: { guests: newUser._id },
        },
      );
      // console.log("Event update result:", updateResult);
    } else {
      // console.log("No temp guest found for email:", email);
    }

    // console.log("Sending OTP email to:", email);
    await sendOTPEmail(email, otpCode);
    // console.log("OTP email sent successfully to:", email);

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
      // domain: ".evento-app.io",
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
  function generateUUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
      (c ^ (crypto.randomBytes(1)[0] & (15 >> (c / 4)))).toString(16),
    );
  }
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
        const resetPasswordToken = generateUUID();
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

      // Models.coHostModel
      //   ? Models.coHostModel.deleteMany({ userId })
      //   : console.error("coHostModel is undefined"),

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
