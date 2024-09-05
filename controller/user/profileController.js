const User = require("../../models/userModel");
const Event = require("../../models/eventModel");
const Models = require("../../models/index");
const helper = require("../../helper/helper");
exports.getProfile = async (req, res) => {
  try {
    console.log("req.user", req.user);
    console.log("**************1******************");
    const userInfo = await User.findOne({ _id: req.user._id })
      .select(
        "firstName lastName name lastName email email_verified countryCode phoneNumber phone_verified address bio URL DOB profileImage loginTime resetPasswordToken resetPasswordExpires forgotPasswordToken email_otp phone_otp is_block interest socialLinks role devices",
      )
      .populate({ path: "interest", select: "_id name" });
    console.log("****************2****************");
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
    console.log("****************3****************");
    const attendEvents = await Models.eventAttendesUserModel
      .find({ userId: req.user._id })
      .exec();
    console.log("*****************4***************");
    const favouriteEvents = await Models.eventFavouriteUserModel
      .find({ userId: req.user._id, favourite: 1 })
      .exec();
    console.log("*****************5***************");
    let attendEventsIds = attendEvents.map((e) => e.eventId.toString());
    let favouriteEventsIds = favouriteEvents.map((e) => e.eventId.toString());
    console.log("*****************6***************");
    // Ajout des propriétés isGoing, isFavourite, et isHosted
    const differentiatedEvents = allEvents.map((event) => {
      return {
        ...event._doc,
        isGoing: attendEventsIds.includes(event._id.toString()),
        isFavourite: favouriteEventsIds.includes(event._id.toString()),
        isHosted: event.user._id.toString() === req.user._id.toString(),
      };
    });
    console.log("*****************7***************");
    // Filtrage des événements indésirables
    const filteredEvents = differentiatedEvents.filter((event) => {
      return event.isGoing || event.isFavourite || event.isHosted;
    });
    console.log("*****************8***************");
    // Filtrer les événements à venir
    const filteredUpcomingEvents = filteredEvents.filter((event) => {
      const endDate = new Date(event.details.endDate);
      return endDate >= new Date(); // Garde les événements à venir
    });
    console.log("****************9****************");
    // Filtrer les événements passés
    const filteredPastEvents = filteredEvents.filter((event) => {
      const endDate = new Date(event.details.endDate);
      return endDate < new Date(); // Garde les événements passés
    });
    console.log("********************************");
    // Filtrer les événements auxquels l'utilisateur participe
    const filteredUpcomingEventsAttened = filteredEvents.filter((event) => {
      return event.isGoing || event.isFavourite;
    });
    console.log("********************************");
    let countFollowing = await Models.userFollowModel.countDocuments({
      follower: req.user._id,
    });
    let countTotalEventIAttended =
      await Models.eventAttendesUserModel.countDocuments({
        userId: req.user._id,
      });
    console.log("********************************");
    let obj = {};
    obj.userInfo = userInfo;
    obj.upcomingEvents = filteredUpcomingEvents; // Inclut les événements à venir
    obj.pastEvents = filteredPastEvents; // Inclut les événements passés
    obj.following = countFollowing;
    obj.totalEventAttended = countTotalEventIAttended;
    obj.filteredUpcomingEventsAttened = filteredUpcomingEventsAttened; // Inclut les événements "going" ou "favourite"
    console.log("********************************");
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

exports.updateProfile = (req, res) => {
  // Logique pour le login
  res.send("Updated profile");
};
