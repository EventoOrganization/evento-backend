// controller/profileController.js;
const bcrypt = require("bcrypt");
const helper = require("../helper/helper");
const Models = require("../models/index");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
exports.getLoggedUserProfile = async (req, res) => {
  console.log("req.user in getLoggedUserProfile", req.user);

  try {
    if (!req.user || !req.user._id) {
      console.error("No user found in request");
      return res
        .status(401)
        .json({ status: false, message: "User not authenticated" });
    }

    const userInfo = await User.findOne({ _id: req.user._id })
      .select(
        "firstName lastName username email email_verified countryCode phoneNumber phone_verified address bio URL DOB profileImage interests socialLinks role devices",
      )
      .populate({ path: "interests", select: "_id username" });

    if (!userInfo) {
      console.error("User not found in the database for ID:", req.user._id);
      return res.status(404).json({ status: false, message: "User not found" });
    }

    console.log("User info retrieved:", userInfo);

    // Log for all events being fetched
    const allEvents = await Event.find({})
      .populate({ path: "user", select: "firstName lastName username" })
      .populate({ path: "interests", select: "_id username profileImage" })
      .populate({
        path: "guests",
        select: "firstName lastName username profileImage",
      })
      .populate({
        path: "coHosts",
        select: "firstName lastName username profileImage",
      })
      .exec();

    console.log("All events retrieved:", allEvents.length);

    const attendEvents = await Models.eventAttendesUserModel
      .find({ userId: req.user._id })
      .exec();
    console.log("Attend events:", attendEvents.length);

    const favouriteEvents = await Models.eventFavouriteUserModel
      .find({ userId: req.user._id, favourite: 1 })
      .exec();
    console.log("Favourite events:", favouriteEvents.length);

    let attendEventsIds = attendEvents.map((e) => e.eventId.toString());
    let favouriteEventsIds = favouriteEvents.map((e) => e.eventId.toString());

    const differentiatedEvents = allEvents.map((event) => {
      return {
        ...event._doc,
        isGoing: attendEventsIds.includes(event._id.toString()),
        isFavourite: favouriteEventsIds.includes(event._id.toString()),
        isHosted: event.user._id.toString() === req.user._id.toString(),
      };
    });

    console.log("Differentiated events:", differentiatedEvents.length);

    const filteredEvents = differentiatedEvents.filter((event) => {
      return event.isGoing || event.isFavourite || event.isHosted;
    });
    console.log("Filtered events:", filteredEvents.length);

    const filteredUpcomingEvents = filteredEvents.filter((event) => {
      const endDate = new Date(event.details.endDate);
      return endDate >= new Date();
    });
    console.log("Filtered upcoming events:", filteredUpcomingEvents.length);

    const filteredPastEvents = filteredEvents.filter((event) => {
      const endDate = new Date(event.details.endDate);
      return endDate < new Date();
    });
    console.log("Filtered past events:", filteredPastEvents.length);

    const filteredUpcomingEventsAttened = filteredEvents.filter((event) => {
      return event.isGoing || event.isFavourite;
    });
    console.log(
      "Filtered upcoming attended events:",
      filteredUpcomingEventsAttened.length,
    );

    let countFollowing = await Models.userFollowModel.countDocuments({
      follower: req.user._id,
    });
    console.log("Following count:", countFollowing);

    let countTotalEventIAttended =
      await Models.eventAttendesUserModel.countDocuments({
        userId: req.user._id,
      });
    console.log("Total events attended:", countTotalEventIAttended);

    userInfo._doc.following = countFollowing;
    userInfo._doc.totalEventAttended = countTotalEventIAttended;

    let obj = {};
    obj.userInfo = userInfo;
    obj.upcomingEvents = filteredUpcomingEvents;
    obj.pastEvents = filteredPastEvents;
    obj.filteredUpcomingEventsAttened = filteredUpcomingEventsAttened;

    console.log("Final response object:", obj);

    if (userInfo.password) {
      delete userInfo.password;
      delete userInfo.otp;
    }

    return helper.success(res, "Profile retrieved successfully", obj);
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
      .select("firstName lastName name email profileImage bio URL socialLinks")
      .exec();

    if (!userInfo) {
      return res
        .status(404)
        .json({ status: false, message: "User not found." });
    }

    // Récupérer les événements auxquels l'utilisateur a participé, qu'il a favorisés ou hébergés
    const allEvents = await Event.find({
      $or: [
        { "guests.user": userId },
        { "coHosts.user": userId },
        { user: userId },
      ],
    })
      .populate({
        path: "user",
        select: "firstName lastName name profileImage",
      })
      .populate({
        path: "guests.user",
        select: "firstName lastName name profileImage",
      })
      .populate({
        path: "coHosts.user",
        select: "firstName lastName name profileImage",
      })
      .exec();

    // Filtrer les événements à venir et passés, etc.
    const upcomingEvents = allEvents.filter(
      (event) => new Date(event.details.endDate) >= new Date(),
    );
    const pastEvents = allEvents.filter(
      (event) => new Date(event.details.endDate) < new Date(),
    );

    let obj = {
      userInfo,
      upcomingEvents,
      pastEvents,
    };
    console.log(obj);
    return res.status(200).json({
      status: true,
      message: "User profile fetched successfully",
      data: obj,
    });
  } catch (error) {
    console.error("Error fetching user profile by ID:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};
exports.updateProfile = async (req, res) => {
  console.log("Starting updateProfile function"); // Log de début de fonction
  try {
    const userId = req.user._id;
    console.log("User ID:", userId); // Log ID utilisateur

    const user = await Models.userModel.findById(userId);
    if (!user) {
      console.log("User not found for ID:", userId); // Log utilisateur non trouvé
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
    } = req.body;

    console.log("Request body:", req.body); // Log données de la requête

    if (username && username !== user.username) updateData.username = username;
    if (firstName && firstName !== user.firstName)
      updateData.firstName = firstName;
    if (lastName && lastName !== user.lastName) updateData.lastName = lastName;
    if (address && address !== user.address) updateData.address = address;
    if (bio && bio !== user.bio) updateData.bio = bio;
    if (URL && URL !== user.URL) updateData.URL = URL;
    if (DOB && DOB !== user.DOB) updateData.DOB = DOB;

    // Gestion de l'email
    if (email && email !== user.email) {
      console.log("Checking for email duplication:", email); // Log de vérification de l'email
      const isEmailExist = await Models.userModel.findOne({
        email,
        _id: { $ne: userId },
      });
      if (isEmailExist) {
        console.log("Duplicate email found:", email); // Log email dupliqué
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
      console.log("Updating password"); // Log de mise à jour du mot de passe
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }

    // Gestion de l'image de profil
    if (req.files && req.files.profileImage) {
      const file = req.files.profileImage;
      console.log("Profile image file received:", file); // Log fichier d'image reçu

      if (!file.mimetype.startsWith("image/")) {
        console.log("Invalid file type for profile image:", file.mimetype); // Log type de fichier invalide
        return res.status(400).json({
          status: false,
          message: "Only image files are allowed for the profile image",
        });
      }

      try {
        console.log("Uploading profile image..."); // Log du début de l'upload d'image
        const imageUrl = await helper.fileUpload(file, "profile");
        console.log("Profile image uploaded:", imageUrl); // Log image téléchargée
        updateData.profileImage = imageUrl;
      } catch (error) {
        console.log("Error uploading profile image:", error); // Log erreur lors du téléchargement de l'image
        return res.status(500).json({
          status: false,
          message: "Error uploading profile image",
          error: error.message,
        });
      }
    }

    // Gestion des liens sociaux
    if (req.body.socialLinks) {
      console.log("Processing social links"); // Log traitement des liens sociaux
      let socialLinks = [];
      try {
        socialLinks = JSON.parse(req.body.socialLinks);
      } catch (error) {
        console.log("Failed to parse social links:", error); // Log échec de parsing des liens sociaux
        return res.status(400).json({
          status: false,
          message: "Failed to parse social links",
          error: error.message,
        });
      }

      socialLinks.forEach((link) => {
        if (!link.platform || !link.url) {
          console.log("Invalid social link:", link); // Log lien social invalide
          return res.status(400).json({
            status: false,
            message: "Each social link must include a platform and a URL",
          });
        }
      });

      const uniqueLinks = Array.from(
        new Set(socialLinks.map((link) => link.platform)),
      ).map((platform) =>
        socialLinks.find((link) => link.platform === platform),
      );

      updateData.socialLinks = uniqueLinks;
    }

    // Gestion des intérêts
    if (req.body.interests) {
      console.log("Processing interests"); // Log traitement des intérêts
      let interestsArray = [];
      try {
        interestsArray = JSON.parse(req.body.interests);
      } catch (error) {
        console.log("Failed to parse interests:", error); // Log échec parsing des intérêts
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
    }

    // Sauvegarde des données mises à jour dans la base de données
    console.log("Updating user data in database"); // Log début mise à jour des données
    const updatedUser = await Models.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true },
    );

    if (!updatedUser) {
      console.log("Failed to update user profile in database"); // Log échec de mise à jour
      return res.status(500).json({
        status: false,
        message: "Failed to update user profile",
      });
    }

    // Retourner les données mises à jour
    console.log("Profile updated successfully:", updatedUser); // Log succès de mise à jour
    return res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error); // Log erreur générale

    // Vérification si une réponse a déjà été envoyée
    if (!res.headersSent) {
      return res.status(500).json({
        status: false,
        message: "An unexpected error occurred. Please try again later.",
        error: error.message,
      });
    }
  }
};
