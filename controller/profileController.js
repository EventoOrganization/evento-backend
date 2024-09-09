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
        "firstName lastName name email email_verified countryCode phoneNumber phone_verified address bio URL DOB profileImage interest socialLinks role devices",
      )
      .populate({ path: "interest", select: "_id name" });

    if (!userInfo) {
      console.error("User not found in the database for ID:", req.user._id);
      return res.status(404).json({ status: false, message: "User not found" });
    }

    console.log("User info retrieved:", userInfo);

    // Log for all events being fetched
    const allEvents = await Event.find({})
      .populate({ path: "user", select: "firstName lastName name" })
      .populate({ path: "interest", select: "_id name profileImage" })
      .populate({
        path: "guests",
        select: "firstName lastName name profileImage",
      })
      .populate({
        path: "coHosts",
        select: "firstName lastName name profileImage",
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
  try {
    const userId = req.user._id;

    // 1. Vérifier si l'utilisateur existe
    const user = await Models.userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // 2. Préparer les données pour la mise à jour
    let updateData = {}; // Objet qui contiendra les données à mettre à jour

    // 3. Gestion des informations de base du profil utilisateur
    const {
      name,
      firstName,
      lastName,
      address,
      bio,
      URL,
      DOB,
      email,
      countryCode,
      phoneNumber, // Gestion du numéro de téléphone sans vérification
      password, // Nouveau mot de passe (si changé)
    } = req.body;

    if (name && name !== user.name) updateData.name = name;
    if (firstName && firstName !== user.firstName)
      updateData.firstName = firstName;
    if (lastName && lastName !== user.lastName) updateData.lastName = lastName;
    if (address && address !== user.address) updateData.address = address;
    if (bio && bio !== user.bio) updateData.bio = bio;
    if (URL && URL !== user.URL) updateData.URL = URL;
    if (DOB && DOB !== user.DOB) updateData.DOB = DOB;

    // 4. Gestion de l'email (sans vérification)
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

    // 5. Gestion du numéro de téléphone
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      updateData.phoneNumber = phoneNumber;
    }

    // 6. Gestion du mot de passe (si l'utilisateur souhaite le changer)
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updateData.password = hashedPassword;
    }

    // 7. Gestion de l'image de profil
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

    // 8. Gestion des liens sociaux
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

      socialLinks.forEach((link) => {
        if (!link.platform || !link.url) {
          return res.status(400).json({
            status: false,
            message: "Each social link must include a platform and a URL",
          });
        }
      });

      // Supprimer les doublons de plateformes
      const uniqueLinks = Array.from(
        new Set(socialLinks.map((link) => link.platform)),
      ).map((platform) =>
        socialLinks.find((link) => link.platform === platform),
      );

      updateData.socialLinks = uniqueLinks;
    }

    // 9. Gestion des intérêts
    if (req.body.interest) {
      let interestArray = [];
      try {
        interestArray = JSON.parse(req.body.interest);
      } catch (error) {
        return res.status(400).json({
          status: false,
          message: "Failed to parse interests",
          error: error.message,
        });
      }

      const validInterests = interestArray
        .map((id) => {
          if (mongoose.Types.ObjectId.isValid(id)) {
            return new mongoose.Types.ObjectId(id); // Utiliser 'new' ici pour créer ObjectId
          } else {
            return null;
          }
        })
        .filter(Boolean); // Supprimer les valeurs nulles

      updateData.interest = validInterests;
    }

    // 10. Sauvegarde des données mises à jour dans la base de données
    const updatedUser = await Models.userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true },
    );

    if (!updatedUser) {
      return res.status(500).json({
        status: false,
        message: "Failed to update user profile",
      });
    }

    // 11. Retourner les données mises à jour
    return res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      status: false,
      message: "An unexpected error occurred. Please try again later.",
      error: error.message,
    });
  }
};
