// controller/profileController.js
const User = require("../models/userModel");
const Event = require("../models/eventModel");
const Models = require("../models");
const helper = require("../helper/helper");
exports.getLoggedUserProfile = async (req, res) => {
  try {
    console.log("req.user", req.user);
    const userInfo = await User.findOne({ _id: req.user._id })
      .select(
        "firstName lastName name lastName email email_verified countryCode phoneNumber phone_verified address bio URL DOB profileImage loginTime resetPasswordToken resetPasswordExpires forgotPasswordToken email_otp phone_otp is_block interest socialLinks role devices",
      )
      .populate({ path: "interest", select: "_id name" });
    const allEvents = await Event.find({})
      .populate({
        path: "user",
        select: "firstName lastName name",
      })
      .populate({
        path: "interest",
        select: "_id name profileImage",
      })
      .populate({
        path: "guests",
        select: "firstName lastName name profileImage",
      })
      .populate({
        path: "coHosts",
        select: "firstName lastName name profileImage",
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
      return {
        ...event._doc,
        isGoing: attendEventsIds.includes(event._id.toString()),
        isFavourite: favouriteEventsIds.includes(event._id.toString()),
        isHosted: event.user._id.toString() === req.user._id.toString(),
      };
    });
    const filteredEvents = differentiatedEvents.filter((event) => {
      return event.isGoing || event.isFavourite || event.isHosted;
    });
    const filteredUpcomingEvents = filteredEvents.filter((event) => {
      const endDate = new Date(event.details.endDate);
      return endDate >= new Date();
    });
    const filteredPastEvents = filteredEvents.filter((event) => {
      const endDate = new Date(event.details.endDate);
      return endDate < new Date();
    });
    const filteredUpcomingEventsAttened = filteredEvents.filter((event) => {
      return event.isGoing || event.isFavourite;
    });
    let countFollowing = await Models.userFollowModel.countDocuments({
      follower: req.user._id,
    });
    let countTotalEventIAttended =
      await Models.eventAttendesUserModel.countDocuments({
        userId: req.user._id,
      });
    userInfo._doc.following = countFollowing;
    userInfo._doc.totalEventAttended = countTotalEventIAttended;
    let obj = {};
    obj.userInfo = userInfo;
    obj.upcomingEvents = filteredUpcomingEvents;
    obj.pastEvents = filteredPastEvents;
    obj.filteredUpcomingEventsAttened = filteredUpcomingEventsAttened;
    if (userInfo.password) {
      delete userInfo.password;
      delete userInfo.otp;
      return helper.success(res, "Profile get Successfully", obj);
    }
    console.log(obj.userInfo);
    return helper.success(res, "Profile get Successfully", obj);
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    let image = null;
    let socialLinks = null;

    // Gérer socialLinks
    if (req.body.socialLinks) {
      try {
        socialLinks = JSON.parse(req.body.socialLinks);
        console.log("Parsed socialLinks:", socialLinks);
      } catch (error) {
        return res.status(400).json({
          status: false,
          message: "Failed to parse social links",
          error: error.toString(),
        });
      }
    }

    // Gérer les fichiers d'image
    if (req.files && req.files.profileImage) {
      const file = req.files.profileImage;

      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          status: false,
          message: "Only image files are allowed for the profile image.",
        });
      }

      try {
        image = await helper.fileUpload(file, "profile");
      } catch (error) {
        return res.status(500).json({
          status: false,
          message: "Error uploading profile image.",
          error: error.message,
        });
      }
    }

    // Construire l'objet à sauvegarder
    let objToSave = {};
    if (req.body.firstName && req.body.firstName !== "null")
      objToSave.firstName = req.body.firstName;
    if (req.body.lastName && req.body.lastName !== "null")
      objToSave.lastName = req.body.lastName;
    if (req.body.address && req.body.address !== "null")
      objToSave.address = req.body.address;
    if (req.body.bio && req.body.bio !== "null") objToSave.bio = req.body.bio;
    if (req.body.URL && req.body.URL !== "null") objToSave.URL = req.body.URL;
    if (req.body.DOB && req.body.DOB !== "null") objToSave.DOB = req.body.DOB;
    if (image) objToSave.profileImage = image;
    if (socialLinks && socialLinks.length > 0)
      objToSave.socialLinks = socialLinks;

    if (req.body.name) {
      const isNameExist = await Models.userModel.findOne({
        name: { $regex: new RegExp(req.body.name, "i") },
        _id: { $ne: req.user.id },
      });
      if (isNameExist) {
        return res.status(409).json({
          status: false,
          message: "Username already exists. Please choose another one.",
        });
      }
    }

    const dataUpdate = await Models.userModel.findByIdAndUpdate(
      { _id: req.user._id },
      { $set: objToSave },
      { new: true },
    );

    if (!dataUpdate) {
      return res.status(404).json({
        status: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Profile updated successfully.",
      data: dataUpdate,
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    return res.status(500).json({
      status: false,
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};
