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
    if (req.files && req.files.profileImage) {
      var image = req.files.profileImage;

      if (image) {
        image = await helper.fileUpload(image, "profile");
      }
    }
    let data = await Models.userModel.findById({ _id: req.user._id });

    let objToSave = {};
    objToSave = {
      name: req.body.name,
      aboutMe: req.body.aboutMe,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      countryCode: req.body.countryCode,
      phoneNumber: req.body.phoneNumber,
      DOB: req.body.DOB,
      profileImage: image,
      bio: req.body.bio,
    };
    const isNameExist = await Models.userModel.findOne({
      name: { $regex: new RegExp(req.body.name, "i") }, // Case-insensitive search for name
      _id: { $ne: req.user.id }, // Exclude current user by ID
    });
    if (isNameExist) {
      return helper.failed(
        res,
        "Sorry this username already exists, please choose another one",
      );
    }
    if (req.body && req.body.interest && req.body.interest.length > 0) {
      objToSave.interest = JSON.parse(req.body.interest);
      await Models.userModel.updateOne(
        { _id: req.user._id },
        { $set: { interest: [] } },
      );
    }
    let dataUpdate = await Models.userModel.findByIdAndUpdate(
      { _id: req.user._id },
      {
        $set: objToSave,
      },
      { new: true },
    );
    return helper.success(res, "Profile updated successfully", dataUpdate);
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message });
  }
};
