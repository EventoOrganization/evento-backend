// controller/profileController.js;
const bcrypt = require("bcrypt");
const helper = require("../helper/helper");
const Models = require("../models/index");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
const { isAfter, startOfDay } = require("date-fns");
const { ObjectId } = require("mongoose").Types;

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
      .populate("requested", "firstName lastName username profileImage")
      .populate("tempGuests")
      .populate({
        path: "coHosts.userId",
        select: "username email profileImage",
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
      .filter((event) => event.user && event.user._id)
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
    const pastEventsGoing = enrichedEvents.filter((event) => {
      if (!event.details?.endDate) return false;

      const eventEndDate = new Date(event.details.endDate);
      const today = startOfDay(new Date());
      // Vérifier si l'événement est terminé (la journée complète)
      return isAfter(today, eventEndDate) && event.isGoing;
    });
    const pastEventsHosted = enrichedEvents.filter((event) => {
      if (!event.details?.endDate) return false;

      const eventEndDate = new Date(event.details.endDate);
      const today = startOfDay(new Date());
      // Vérifier si l'événement est terminé (la journée complète)
      return isAfter(today, eventEndDate) && event.isHosted;
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
    const hostedEvents = enrichedEvents.filter(
      (event) =>
        event.isHosted &&
        !pastEventsHosted.some(
          (pastEvent) => pastEvent._id.toString() === event._id.toString(),
        ),
    );
    userInfo._doc.totalEventAttended = countTotalEventIAttended;
    return res.status(200).json({
      status: true,
      message: "Profile retrieved successfully",
      data: {
        ...userInfo._doc,
        pastEventsGoing: pastEventsGoing,
        pastEventsHosted: pastEventsHosted,
        hostedEvents,
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

    // Fetch event statuses for the user (isGoing, isFavourite)
    const eventStatuses = await Models.eventStatusSchema.find({ userId });
    const attendEventsIds = eventStatuses
      .filter((es) => es.status === "isGoing")
      .map((es) => es.eventId.toString());

    const favouriteEventsIds = eventStatuses
      .filter((es) => es.status === "isFavourite")
      .map((es) => es.eventId.toString());

    // Fetch all events related to the user
    const allEvents = await Event.find({
      $and: [
        { eventType: "public" },
        {
          $or: [
            { guests: userId },
            { coHosts: userId },
            { user: userId },
            { _id: { $in: attendEventsIds } },
          ],
        },
      ],
    })
      .populate("interests", "_id name")
      .populate("user", "firstName lastName username profileImage")
      .populate("guests.user", "firstName lastName username profileImage")
      .populate({
        path: "coHosts.userId",
        select: "username email profileImage",
      })
      .exec();

    // Enrich the events with user-specific status (isGoing, isFavourite, isHosted)
    const enrichedEvents = allEvents.map((event) => {
      const isHosted =
        event.user && event.user._id.toString() === userId.toString(); // Host case

      const isCoHost = event.coHosts.some((coHost) => {
        const coHostId = coHost.userId?._id || coHost.userId;
        return coHostId?.toString() === userId.toString();
      });

      return {
        ...event._doc,
        isGoing: attendEventsIds.includes(event._id.toString()),
        isFavourite: favouriteEventsIds.includes(event._id.toString()),
        isHosted,
        isCoHost,
      };
    });

    // Separate the events into upcoming and past based on their end date
    const upcomingEvents = enrichedEvents.filter((event) => {
      const isUpcoming = new Date(event.details.endDate) >= new Date();
      const isGoing = event.isGoing;

      return isUpcoming && isGoing;
    });

    const pastEventsGoing = enrichedEvents.filter((event) => {
      if (!event.details?.endDate) return false;

      const eventEndDate = new Date(event.details.endDate);
      const today = startOfDay(new Date());
      // Vérifier si l'événement est terminé (la journée complète)
      return isAfter(today, eventEndDate) && event.isGoing;
    });
    const pastEventsHosted = enrichedEvents.filter((event) => {
      if (!event.details?.endDate) return false;

      const eventEndDate = new Date(event.details.endDate);
      const today = startOfDay(new Date());
      // Vérifier si l'événement est terminé (la journée complète)
      return isAfter(today, eventEndDate) && event.isHosted;
    });

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
    const hostedEvents = enrichedEvents.filter(
      (event) =>
        (event.isHosted || event.isCoHost) &&
        !pastEventsHosted.some(
          (pastEvent) => pastEvent._id.toString() === event._id.toString(),
        ),
    );
    // Structure the response
    return res.status(200).json({
      status: true,
      message: "User profile fetched successfully",
      data: {
        ...userInfo._doc,
        upcomingEvents,
        pastEventsGoing,
        pastEventsHosted,
        hostedEvents,
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
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      console.log("Updating phoneNumber:", phoneNumber);
      updateData.phoneNumber = phoneNumber;
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
exports.updateUserPreferences = async (req, res) => {
  const { preferences } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.preferences = { ...user.preferences, ...preferences };
    await user.save();

    res.status(200).json({ message: "Preferences updated successfully." });
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(500).json({ message: "Failed to update preferences." });
  }
};
