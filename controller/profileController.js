// controller/profileController.js;
const bcrypt = require("bcrypt");
const helper = require("../helper/helper");
const Models = require("../models/index");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
const { isAfter, startOfDay } = require("date-fns");
const { ObjectId } = require("mongoose").Types;
const { sendWhatsAppOTP } = require("../services/whatsappService");
exports.getLoggedUserProfile = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      console.error("No user found in request");
      return res
        .status(401)
        .json({ status: false, message: "User not authenticated" });
    }

    const userInfo = await User.findOne({ _id: req.user._id })
      .select(
        "pwaNotification pwaSubscriptions firstName lastName username email email_verified countryCode phoneNumber phone_verified address bio URL DOB profileImage interests socialLinks role devices preferences",
      )
      .populate("interests", "_id name");

    if (!userInfo) {
      console.error("User not found in the database for ID:", req.user._id);
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const followingUsers = await Models.userFollowModel
      .find({ follower: req.user._id })
      .select("following")
      .exec();
    const followingUserIds = followingUsers.map((follow) =>
      follow.following.toString(),
    );

    const existingFollowingUsers = [];
    const missingFollowingUsers = [];
    for (const followingId of followingUserIds) {
      const user = await User.findById(followingId);
      if (user) {
        existingFollowingUsers.push(followingId);
      } else {
        console.warn(
          `User with ID ${followingId} does not exist in the database. It might be deleted but has residual follow status.`,
        );
        missingFollowingUsers.push(followingId);

        await Models.userFollowModel.deleteOne({
          follower: req.user._id,
          following: followingId,
        });

        await Models.eventStatusSchema.deleteMany({ userId: followingId });
      }
    }

    const followerUsers = await Models.userFollowModel
      .find({ following: req.user._id })
      .select("follower")
      .exec();
    const followerUserIds = followerUsers.map((follow) =>
      follow.follower.toString(),
    );

    const countTotalEventIAttended =
      await Models.eventStatusSchema.countDocuments({
        userId: req.user._id,
        status: "isGoing",
      });
    userInfo._doc.totalEventAttended = countTotalEventIAttended;
    return res.status(200).json({
      status: true,
      message: "Profile retrieved successfully",
      data: {
        ...userInfo._doc,
        followingUserIds: existingFollowingUsers,
        followerUserIds,
      },
    });
  } catch (error) {
    console.error("Error in getLoggedUserProfile:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};
exports.getUserProfileById = async (req, res) => {
  console.log("Inside getUserProfileById", req.params.userId);
  try {
    const userId = new ObjectId(req.params.userId);

    // 📌 Récupérer les infos de l'utilisateur
    const userInfo = await User.findById(userId)
      .select(
        "firstName lastName username email profileImage bio URL socialLinks interests address",
      )
      .populate("interests", "_id name")
      .exec();

    if (!userInfo) {
      return res
        .status(404)
        .json({ status: false, message: "User not found." });
    }

    // 📌 Récupérer les statuts d'événement pour l'utilisateur
    const eventStatuses = await Models.eventStatusSchema.find({ userId });

    const attendEventsIds = eventStatuses
      .filter((es) => es.status === "isGoing")
      .map((es) => es.eventId.toString());

    const favouriteEventsIds = eventStatuses
      .filter((es) => es.status === "isFavourite")
      .map((es) => es.eventId.toString());

    const refusedEventsIds = eventStatuses
      .filter((es) => es.status === "isRefused")
      .map((es) => es.eventId.toString());

    // 📌 Filtrer les événements auxquels l'utilisateur a accès
    const allEvents = await Event.find({
      $and: [
        { _id: { $nin: refusedEventsIds } }, // Exclure les événements refusés
        { hiddenByUsers: { $nin: [userId] } }, // Exclure les événements masqués par l'utilisateur
        {
          $or: [
            { eventType: "public" }, // Tous les événements publics
            { user: userId }, // Événements créés par l'utilisateur
            { guests: userId }, // Événements où l'utilisateur est invité
            { "coHosts.userId": userId }, // Événements où l'utilisateur est co-hôte
            { _id: { $in: attendEventsIds } }, // Événements où l'utilisateur participe
            { _id: { $in: favouriteEventsIds } }, // Événements favoris
          ],
        },
      ],
    })
      .populate("interests", "_id name")
      .populate("user", "firstName lastName username profileImage")
      .populate("guests", "firstName lastName username profileImage")
      .populate({
        path: "coHosts.userId",
        select: "username email profileImage",
      })
      .exec();

    // 📌 Ajouter des flags aux événements
    const enrichedEvents = allEvents.map((event) => {
      const isHosted = event.user?._id.toString() === userId.toString();
      const isCoHost = event.coHosts.some(
        (coHost) => coHost.userId?._id?.toString() === userId.toString(),
      );

      return {
        ...event._doc,
        isHosted,
        isCoHost,
        isGoing: attendEventsIds.includes(event._id.toString()),
        isFavourite: favouriteEventsIds.includes(event._id.toString()),
        isRefused: refusedEventsIds.includes(event._id.toString()),
      };
    });

    // 📌 Gestion des événements passés et futurs
    const today = new Date();

    const isUpcomingOrOngoing = (event) =>
      new Date(event.details.date) > today || // 🔹 Futur
      (new Date(event.details.date) <= today &&
        new Date(event.details.endDate) > today); // 🔹 En cours

    const upcomingEvents = enrichedEvents.filter(
      (event) => isUpcomingOrOngoing(event) && event.isGoing,
    );

    const pastEventsGoing = enrichedEvents.filter(
      (event) => new Date(event.details.endDate) < today && event.isGoing,
    );

    const pastEventsHosted = enrichedEvents.filter(
      (event) => new Date(event.details.endDate) < today && event.isHosted,
    );

    return res.status(200).json({
      status: true,
      message: "User profile fetched successfully",
      data: {
        ...userInfo._doc,
        upcomingEvents,
        pastEventsGoing,
        pastEventsHosted,
        hostedEvents: enrichedEvents.filter(
          (event) => event.isHosted || event.isCoHost,
        ),
        favouriteEvents: enrichedEvents.filter((event) => event.isFavourite),
        refusedEvents: enrichedEvents.filter((event) => event.isRefused),
      },
    });
  } catch (error) {
    console.error("Error fetching user profile by ID:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

exports.updateProfile = async (req, res) => {
  console.log("Received req.body:", req.body);

  try {
    const userId = req.user._id;
    console.log("User ID:", userId);

    const user = await Models.userModel.findById(userId);
    if (!user) {
      console.log("User not found:", userId);
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    let updateData = {};
    const {
      username,
      firstName,
      lastName,
      address,
      bio,
      URL,
      DOB,
      email,
      countryCode,
      phoneNumber,
      password,
      pwaSubscription,
      browser,
      pwaNotification,
    } = req.body;

    console.log("Update fields received:", {
      username,
      firstName,
      lastName,
      address,
      bio,
      URL,
      DOB,
      email,
      countryCode,
      phoneNumber,
      password,
      pwaSubscription,
      browser,
      pwaNotification,
    });

    if (username && username !== user.username) {
      const normalizedUsername = username
        .toLowerCase()
        .normalize("NFD") // Décompose les caractères accentués (ex: é -> e)
        .replace(/[\u0300-\u036f]/g, "") // Supprimer les diacritiques (accents)
        .replace(/\s+/g, "") // Supprimer tous les espaces
        .replace(/[^a-z]/g, ""); // Supprimer tous les caractères non alphabétiques
      if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
        return res.status(400).json({
          status: false,
          message: "Username must be between 3 and 20 characters long.",
        });
      }
      const existingUser = await Models.userModel.findOne({
        usernameNormalized: normalizedUsername,
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(409).json({
          status: false,
          message: "Username already exists. Please choose another one.",
        });
      }
      updateData.username = username;
      updateData.usernameNormalized = normalizedUsername;
    }

    // Vérification des autres champs
    if (firstName && firstName !== user.firstName) {
      console.log("Updating firstName:", firstName);
      updateData.firstName = firstName;
    }
    if (lastName && lastName !== user.lastName) {
      console.log("Updating lastName:", lastName);
      updateData.lastName = lastName;
    }
    if (address && address !== user.address) {
      console.log("Updating address:", address);
      updateData.address = address;
    }
    if (bio && bio !== user.bio) {
      console.log("Updating bio:", bio);
      updateData.bio = bio;
    }
    if (URL && URL !== user.URL) {
      console.log("Updating URL:", URL);
      updateData.URL = URL;
    }
    if (DOB && DOB !== user.DOB) {
      console.log("Updating DOB:", DOB);
      updateData.DOB = DOB;
    }

    // Gestion de l'email
    if (email && email !== user.email) {
      console.log("Checking if email exists:", email);
      const isEmailExist = await Models.userModel.findOne({
        email,
        _id: { $ne: userId },
      });
      if (isEmailExist) {
        console.log("Email already exists:", email);
        return res.status(409).json({
          status: false,
          message: "Email already exists. Please choose another one.",
        });
      }
      updateData.email = email;
    }
    // Gestion du numéro de téléphone
    if ((countryCode && !phoneNumber) || (!countryCode && phoneNumber)) {
      console.log(
        "Error: countryCode and phoneNumber must be provided together.",
      );
      // return res.status(400).json({
      //   status: false,
      //   message: "Both Country Code and Phone Number are required.",
      // });
    }

    if (countryCode && countryCode !== user.countryCode) {
      console.log("Updating countryCode:", countryCode);
      updateData.countryCode = countryCode;
    }
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      console.log("Updating phoneNumber:", phoneNumber);

      const normalizedPhoneNumber = phoneNumber.replace(/^0+/, "");

      const isPhoneNumberExist = await Models.userModel.findOne({
        phoneNumber: normalizedPhoneNumber,
        _id: { $ne: userId },
      });

      if (isPhoneNumberExist) {
        console.log("Phone number already exists:", phoneNumber);
        return res.status(409).json({
          status: false,
          message: "Phone number already exists. Please choose another one.",
        });
      }

      updateData.phoneNumber = normalizedPhoneNumber;

      console.log("🚀 Calling sendWhatsAppOTP...");
      const otpResult = await sendWhatsAppOTP(req);
      if (!otpResult.success) {
        return res.status(500).json({
          status: false,
          message: otpResult.message,
          error: otpResult.error,
        });
      }
    }
    // Gestion du mot de passe
    if (password) {
      console.log("Updating password");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }

    // Gestion de l'image de profil
    if (req.files && req.files.profileImage) {
      const file = req.files.profileImage;
      console.log("Processing profile image:", file);

      if (!file.mimetype.startsWith("image/")) {
        console.log("Invalid image type:", file.mimetype);
        return res.status(400).json({
          status: false,
          message: "Only image files are allowed for the profile image",
        });
      }

      try {
        const imageUrl = await helper.fileUpload(file, `profile/${userId}`);
        console.log("Profile image uploaded:", imageUrl);
        updateData.profileImage = imageUrl;
      } catch (error) {
        console.log("Error uploading profile image:", error);
        return res.status(500).json({
          status: false,
          message: "Error uploading profile image",
          error: error.message,
        });
      }
    }

    // Gestion des liens sociaux
    if (req.body.socialLinks) {
      let socialLinks = [];
      try {
        socialLinks = JSON.parse(req.body.socialLinks);
        console.log("Parsed socialLinks:", socialLinks);
      } catch (error) {
        console.log("Error parsing social links:", error);
        return res.status(400).json({
          status: false,
          message: "Failed to parse social links",
          error: error.message,
        });
      }
      const validSocialLinks = socialLinks.filter(
        (link) => link.platform && link.url,
      );
      if (validSocialLinks.length === 0) {
        updateData.socialLinks = null;
      } else {
        // Supprimer les doublons par platform
        const uniqueLinks = Array.from(
          new Set(validSocialLinks.map((link) => link.platform)),
        ).map((platform) =>
          validSocialLinks.find((link) => link.platform === platform),
        );
        console.log("Valid and unique socialLinks:", uniqueLinks);
        updateData.socialLinks = uniqueLinks;
      }
    } else {
      updateData.socialLinks = null;
    }

    // Gestion des intérêts
    if (req.body.interest) {
      let interestsArray = [];
      try {
        interestsArray = JSON.parse(req.body.interest);
        console.log("Parsed interestsArray:", interestsArray);
      } catch (error) {
        console.log("Error parsing interests:", error);
        return res.status(400).json({
          status: false,
          message: "Failed to parse interests",
          error: error.message,
        });
      }

      const validInterests = interestsArray
        .map((id) => {
          if (mongoose.Types.ObjectId.isValid(id)) {
            return new mongoose.Types.ObjectId(id);
          } else {
            return null;
          }
        })
        .filter(Boolean);

      console.log("Valid interests:", validInterests);
      updateData.interests = validInterests;
    } else {
      updateData.interests = null;
    }

    // Gestion des notifications PWA
    if (pwaSubscription === null) {
      console.log("Removing PWA subscription for browser:", browser);
      const subscriptionIndex = user.pwaSubscriptions?.findIndex(
        (sub) => sub.browser === browser,
      );

      if (subscriptionIndex > -1) {
        user.pwaSubscriptions.splice(subscriptionIndex, 1);
        console.log(`Removed subscription for browser: ${browser}`);
      } else {
        console.log(`No subscription found for browser: ${browser}`);
      }
    } else if (pwaSubscription) {
      console.log("Updating/Adding PWA subscription:", pwaSubscription);
      const existingSubscription = user.pwaSubscriptions?.find(
        (sub) => sub.browser === browser,
      );

      if (existingSubscription) {
        existingSubscription.endpoint = pwaSubscription.endpoint;
        existingSubscription.keys = pwaSubscription.keys;
      } else {
        user.pwaSubscriptions?.push({
          browser,
          endpoint: pwaSubscription.endpoint,
          keys: pwaSubscription.keys,
        });
      }
    }

    // Gestion du statut de réception des notifications PWA
    if (pwaNotification !== undefined) {
      console.log("Updating pwaNotification status:", pwaNotification);
      user.pwaNotification = pwaNotification;
    }

    const updatedUser = await Models.userModel
      .findByIdAndUpdate(userId, { $set: updateData }, { new: true })
      .populate("interests");

    if (!updatedUser) {
      console.log("Failed to update user profile");
      return res.status(500).json({
        status: false,
        message: "Failed to update user profile",
      });
    }

    // console.log("Profile updated successfully:", updatedUser);
    return res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        status: false,
        message: "An unexpected error occurred. Please try again later.",
        error: error.message,
      });
    }
  }
};
exports.getPreferences = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: "Token is required." });
  }

  try {
    const user = await Models.userModel.findOne({ unsubscribeToken: token });
    const tempGuest = await Models.tempGuestModel.findOne({
      unsubscribeToken: token,
    });

    if (user) {
      return res.status(200).json({ preferences: user.preferences });
    } else if (tempGuest) {
      return res.status(200).json({ preferences: tempGuest.preferences });
    } else {
      return res
        .status(404)
        .json({ message: "No user or temp guest found for this token." });
    }
  } catch (error) {
    console.error("Error fetching preferences:", error);
    res.status(500).json({ message: "Server error." });
  }
};

exports.updatePreferences = async (req, res) => {
  const { token, preferences } = req.body;

  if (!token || !preferences) {
    return res
      .status(400)
      .json({ message: "Token and preferences are required." });
  }

  try {
    // Rechercher dans les modèles `User` et `TempGuest`
    const user = await Models.userModel.findOne({ unsubscribeToken: token });
    const tempGuest = await Models.tempGuestModel.findOne({
      unsubscribeToken: token,
    });
    if (user) {
      user.preferences = preferences;
      await user.save();
      return res
        .status(200)
        .json({ message: "Preferences updated successfully." });
    } else if (tempGuest) {
      await tempGuest.updateOne({ preferences });
      return res
        .status(200)
        .json({ message: "Preferences updated successfully." });
    } else {
      return res
        .status(404)
        .json({ message: "No user or temp guest found for this token." });
    }
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(500).json({ message: "Server error." });
  }
};
