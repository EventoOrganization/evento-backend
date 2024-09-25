// controller/profileController.js;
const bcrypt = require("bcrypt");
const helper = require("../helper/helper");
const Models = require("../models/index");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
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
        "firstName lastName username email email_verified countryCode phoneNumber phone_verified address bio URL DOB profileImage interests socialLinks role devices",
      )
      .populate({ path: "interests", select: "_id name" });

    if (!userInfo) {
      console.error("User not found in the database for ID:", req.user._id);
      return res.status(404).json({ status: false, message: "User not found" });
    }

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

    const attendEvents = await Models.eventAttendesUserModel
      .find({ userId: req.user._id })
      .exec();

    const favouriteEvents = await Models.eventFavouriteUserModel
      .find({ userId: req.user._id, favourite: 1 })
      .exec();

    let attendEventsIds = attendEvents.map((e) => e.eventId.toString());
    let favouriteEventsIds = favouriteEvents.map((e) => e.eventId.toString());

    const differentiatedEvents = allEvents.map((event) => {
      const isHosted = event.user
        ? event.user._id.toString() === req.user._id.toString()
        : false;
      return {
        ...event._doc,
        isGoing: attendEventsIds.includes(event._id.toString()),
        isFavourite: favouriteEventsIds.includes(event._id.toString()),
        isHosted,
      };
    });

    const hostedEvents = differentiatedEvents.filter((event) => event.isHosted);

    const activeEvents = differentiatedEvents.filter(
      (event) => event.isGoing || event.isFavourite,
    );
    const upcomingEvents = activeEvents.filter(
      (event) => new Date(event.details.endDate) >= new Date(),
    );
    const pastEvents = activeEvents.filter(
      (event) => new Date(event.details.endDate) < new Date(),
    );
    let countFollowing = await Models.userFollowModel.countDocuments({
      follower: req.user._id,
    });

    let countTotalEventIAttended =
      await Models.eventAttendesUserModel.countDocuments({
        userId: req.user._id,
      });

    userInfo._doc.following = countFollowing;
    userInfo._doc.totalEventAttended = countTotalEventIAttended;

    let obj = {
      userInfo,
      upcomingEvents,
      pastEvents,
      hostedEvents,
    };

    return res.status(200).json({
      status: true,
      message: "Profile retrieved successfully",
      data: obj,
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

    const allEvents = await Event.find({
      $or: [{ guests: userId }, { coHosts: userId }, { user: userId }],
    })
      .populate("interests", "_id name")
      .populate("user", "firstName lastName username profileImage")
      .populate("guests.user", "firstName lastName username profileImage")
      .populate("coHosts.user", "firstName lastName username profileImage")
      .exec();

    const attendEvents = await Models.eventAttendesUserModel
      .find({ userId: userId })
      .exec();

    const favouriteEvents = await Models.eventFavouriteUserModel
      .find({ userId: userId, favourite: 1 })
      .exec();
    let attendEventsIds = attendEvents.map((e) => e.eventId.toString());
    let favouriteEventsIds = favouriteEvents.map((e) => e.eventId.toString());

    const differentiatedEvents = allEvents.map((event) => {
      return {
        ...event._doc,
        isGoing: attendEventsIds.includes(event._id.toString()),
        isFavourite: favouriteEventsIds.includes(event._id.toString()),
        isHosted: event.user._id.toString() === userId.toString(),
      };
    });
    const hostedEvents = differentiatedEvents.filter((event) => event.isHosted);

    const activeEvents = differentiatedEvents.filter(
      (event) => event.isGoing || event.isFavourite,
    );
    const upcomingEvents = activeEvents.filter(
      (event) => new Date(event.details.endDate) >= new Date(),
    );
    const pastEvents = activeEvents.filter(
      (event) => new Date(event.details.endDate) < new Date(),
    );
    let countFollowing = await Models.userFollowModel.countDocuments({
      follower: userId,
    });

    let countTotalEventIAttended =
      await Models.eventAttendesUserModel.countDocuments({
        userId: userId,
      });

    userInfo._doc.following = countFollowing;
    userInfo._doc.totalEventAttended = countTotalEventIAttended;

    let obj = {
      userInfo,
      upcomingEvents,
      pastEvents,
      hostedEvents,
    };
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

      socialLinks.forEach((link) => {
        if (!link.platform || !link.url) {
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
    } else {
      updateData.socialLinks = null;
    }

    // Gestion des intérêts
    if (req.body.interest) {
      console.log("Processing interests");
      let interestsArray = [];
      try {
        interestsArray = JSON.parse(req.body.interest);
      } catch (error) {
        console.log("Failed to parse interests:", error);
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
