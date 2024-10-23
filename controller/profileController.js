// controller/profileController.js;
const bcrypt = require("bcrypt");
const helper = require("../helper/helper");
const Models = require("../models/index");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
const { sendNotification } = require("../helper/pwaNotificationPush");
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
        "pwaNotification pwaSubscriptions firstName lastName username email email_verified countryCode phoneNumber phone_verified address bio URL DOB profileImage interests socialLinks role devices",
      )
      .populate({ path: "interests", select: "_id name" });

    if (!userInfo) {
      console.error("User not found in the database for ID:", req.user._id);
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Fetch all events
    const allEvents = await Event.find({})
      .populate({
        path: "user",
        select: "firstName lastName username profileImage",
      })
      .populate({ path: "interests", select: "_id name" })
      .populate({
        path: "guests",
        select: "firstName lastName username profileImage",
      })
      .populate({
        path: "coHosts",
        populate: {
          path: "user_id",
          select: "username email profileImage",
        },
      })
      .exec();

    const userId = req.user._id;
    const eventStatuses = await Models.eventStatusSchema.find({ userId });
    const attendEventsIds = eventStatuses
      .filter((es) => es.status === "isGoing")
      .map((es) => es.eventId.toString());
    const favouriteEventsIds = eventStatuses
      .filter((es) => es.status === "isFavourite")
      .map((es) => es.eventId.toString());

    const enrichedEvents = allEvents
      .filter((event) => event.user && event.user._id) // Filtrer les événements sans utilisateur valide
      .map((event) => {
        const isHosted =
          event.user && event.user._id
            ? event.user._id.toString() === req.user._id.toString()
            : false;

        return {
          ...event._doc,
          isGoing: attendEventsIds.includes(event._id.toString()),
          isFavourite: favouriteEventsIds.includes(event._id.toString()),
          isHosted,
        };
      });

    // Filter past events
    const pastEvents = enrichedEvents.filter((event) => {
      const eventEndDate = new Date(event.details.endDate);
      return eventEndDate < new Date() && event.isGoing;
    });

    // retrieve followingUserIds and followerUserIds
    const followingUsers = await Models.userFollowModel
      .find({ follower: req.user._id })
      .select("following")
      .exec();
    const followingUserIds = followingUsers.map((follow) =>
      follow.following.toString(),
    );

    const existingFollowingUsers = [];
    const missingFollowingUsers = [];
    // check if followingUserIds exist in the database
    for (const followingId of followingUserIds) {
      const user = await User.findById(followingId);
      if (user) {
        existingFollowingUsers.push(followingId);
      } else {
        console.warn(
          `User with ID ${followingId} does not exist in the database. It might be deleted but has residual follow status.`,
        );
        missingFollowingUsers.push(followingId);

        // **Supprimer les enregistrements résiduels**
        await Models.userFollowModel.deleteOne({
          follower: req.user._id,
          following: followingId,
        });

        // Supprimer aussi les statuts d'événements résiduels si nécessaire
        await Models.eventStatusSchema.deleteMany({ userId: followingId });
      }
    }

    // retrieve followerUserIds
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
        pastEvents,
        hostedEvents: enrichedEvents.filter((event) => event.isHosted),
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
  try {
    const userId = req.params.userId;

    const userInfo = await User.findById(userId)
      .select(
        "firstName lastName username email profileImage bio URL socialLinks interests",
      )
      .populate("interests", "_id name")
      .exec();

    if (!userInfo) {
      return res
        .status(404)
        .json({ status: false, message: "User not found." });
    }

    // Fetch all events related to the user
    const allEvents = await Event.find({
      $or: [{ guests: userId }, { coHosts: userId }, { user: userId }],
    })
      .populate("interests", "_id name")
      .populate("user", "firstName lastName username profileImage")
      .populate("guests.user", "firstName lastName username profileImage")
      .populate("coHosts.user", "firstName lastName username profileImage")
      .exec();

    // Fetch event statuses for the user (isGoing, isFavourite)
    const eventStatuses = await Models.eventStatusSchema.find({ userId });
    const attendEventsIds = eventStatuses
      .filter((es) => es.status === "isGoing")
      .map((es) => es.eventId.toString());
    const favouriteEventsIds = eventStatuses
      .filter((es) => es.status === "isFavourite")
      .map((es) => es.eventId.toString());

    // Enrich the events with user-specific status (isGoing, isFavourite, isHosted)
    const enrichedEvents = allEvents.map((event) => {
      const isHosted = event.user
        ? event.user._id.toString() === userId.toString()
        : false;

      return {
        ...event._doc,
        isGoing: attendEventsIds.includes(event._id.toString()),
        isFavourite: favouriteEventsIds.includes(event._id.toString()),
        isHosted,
      };
    });

    // Separate the events into upcoming and past based on their end date
    const upcomingEvents = enrichedEvents.filter(
      (event) => new Date(event.details.endDate) >= new Date() && event.isGoing,
    );
    const pastEvents = enrichedEvents.filter(
      (event) => new Date(event.details.endDate) < new Date() && event.isGoing,
    );
    const followingUsers = await Models.userFollowModel
      .find({ follower: userId })
      .select("following")
      .exec();
    const followingUserIds = followingUsers.map((follow) => follow.following);

    let countTotalEventIAttended =
      await Models.eventStatusSchema.countDocuments({
        userId: userId,
        status: "isGoing",
      });

    userInfo._doc.totalEventAttended = countTotalEventIAttended;

    // Structure the response
    return res.status(200).json({
      status: true,
      message: "User profile fetched successfully",
      data: {
        ...userInfo._doc,
        upcomingEvents,
        pastEvents,
        hostedEvents: enrichedEvents.filter((event) => event.isHosted),
        followingUserIds,
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
  console.log("**************************************************************");
  console.log("Received pwaNotification:", req.body.pwaNotification);
  console.log("Received pwaSubscription:", req.body.pwaSubscription);
  console.log("Received browser:", req.body.browser);

  try {
    const userId = req.user._id;
    const { pwaSubscription, browser, pwaNotification } = req.body;
    const user = await Models.userModel.findById(userId);
    if (!user) {
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
      pwaNotificationPushPayload: pwaNotificationPush,
    } = req.body;

    if (username && username !== user.username) {
      const normalizedUsername = username.trim().toLowerCase();
      const isUsernameExist = await Models.userModel.findOne({
        username: normalizedUsername,
        _id: { $ne: userId },
      });
      if (isUsernameExist) {
        return res.status(409).json({
          status: false,
          message: "Username already exists. Please choose another one.",
        });
      }
      updateData.username = normalizedUsername;
    }

    // Vérification des autres champs
    if (firstName && firstName !== user.firstName)
      updateData.firstName = firstName;
    if (lastName && lastName !== user.lastName) updateData.lastName = lastName;
    if (address && address !== user.address) updateData.address = address;
    if (bio && bio !== user.bio) updateData.bio = bio;
    if (URL && URL !== user.URL) updateData.URL = URL;
    if (DOB && DOB !== user.DOB) updateData.DOB = DOB;
    // Gestion de l'email
    if (email && email !== user.email) {
      const isEmailExist = await Models.userModel.findOne({
        email,
        _id: { $ne: userId },
      });
      if (isEmailExist) {
        return res.status(409).json({
          status: false,
          message: "Email already exists. Please choose another one.",
        });
      }
      updateData.email = email;
    }

    // Gestion du numéro de téléphone
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      updateData.phoneNumber = phoneNumber;
    }

    // Gestion du mot de passe
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }
    // Gestion de l'image de profil
    if (req.files && req.files.profileImage) {
      const file = req.files.profileImage;

      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          status: false,
          message: "Only image files are allowed for the profile image",
        });
      }

      try {
        const imageUrl = await helper.fileUpload(file, "profile");
        updateData.profileImage = imageUrl;
      } catch (error) {
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
      } catch (error) {
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
      } catch (error) {
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

      updateData.interests = validInterests;
    } else {
      updateData.interests = null;
    }

    // Gestion des notifications PWA
    if (pwaSubscription === null) {
      // Removing the subscription for the given browser
      const subscriptionIndex = user.pwaSubscriptions?.findIndex(
        (sub) => sub.browser === browser,
      );

      if (subscriptionIndex > -1) {
        // Remove the subscription at the found index
        user.pwaSubscriptions.splice(subscriptionIndex, 1);
        console.log(`Removed subscription for browser: ${browser}`);
      } else {
        console.log(`No subscription found for browser: ${browser}`);
      }
    } else if (pwaSubscription) {
      const existingSubscription = user.pwaSubscriptions?.find(
        (sub) => sub.browser === browser,
      );

      if (existingSubscription) {
        // Update the existing subscription
        existingSubscription.endpoint = pwaSubscription.endpoint;
        existingSubscription.keys = pwaSubscription.keys;
      } else {
        // Add a new subscription
        user.pwaSubscriptions?.push({
          browser,
          endpoint: pwaSubscription.endpoint,
          keys: pwaSubscription.keys,
        });
      }
    }

    // Gestion du statut de réception des notifications PWA
    if (pwaNotification !== undefined) {
      user.pwaNotification = pwaNotification;
    }

    await user.save();

    const updatedUser = await Models.userModel
      .findByIdAndUpdate(userId, { $set: updateData }, { new: true })
      .populate("interests");

    if (!updatedUser) {
      return res.status(500).json({
        status: false,
        message: "Failed to update user profile",
      });
    }

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
