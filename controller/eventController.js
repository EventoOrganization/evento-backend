const Event = require("../models/eventModel");
const Models = require("../models");
const helper = require("../helper/helper");
const path = require("path");
const axios = require("axios");
exports.createEvent = async (req, res) => {
  console.log("req.body", req.body);
  try {
    const {
      title,
      name,
      eventType,
      mode,
      location,
      latitude,
      longitude,
      date,
      endDate,
      startTime,
      endTime,
      description,
      coHosts,
      guests,
      interests,
      uploadedMedia,
      predefinedMedia,
      questions,
      additionalField,
      URL,
      includeChat,
    } = req.body;
    if (
      !title ||
      !name ||
      !eventType ||
      !mode ||
      !location ||
      !latitude ||
      !longitude ||
      !date ||
      !endDate ||
      !startTime ||
      !endTime ||
      !description
    ) {
      return res
        .status(400)
        .json({ status: false, message: "Missing required fields" });
    }
    let imageUrls = [];
    let videoUrls = [];
    for (const media of uploadedMedia) {
      const publicFileUrl = `${process.env.CLIENT_URL}${media.url}`;
      const response = await axios({
        method: "GET",
        url: publicFileUrl,
        responseType: "stream",
      });
      const mediaName = await helper.fileUploadLarge(
        {
          name: path.basename(publicFileUrl),
          data: response.data,
          mimetype:
            media.mimetype ||
            (media.type === "image" ? "image/jpeg" : "video/mp4"),
        },
        "events",
      );
      console.log("mediaName", mediaName);
      if (media.type === "image") {
        imageUrls.push(mediaName);
      } else if (media.type === "video") {
        videoUrls.push(mediaName);
      }
    }
    const predefinedImages = predefinedMedia
      .filter((media) => media.type === "image")
      .map((media) => media.url);

    const predefinedVideos = predefinedMedia
      .filter((media) => media.type === "video")
      .map((media) => media.url);

    imageUrls = [...imageUrls, ...predefinedImages];
    videoUrls = [...videoUrls, ...predefinedVideos];

    // Création de l'objet événement à stocker
    const objToSave = {
      user: req.user._id,
      title,
      eventType,
      details: {
        name,
        images: imageUrls,
        videos: videoUrls,
        loc: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        mode,
        location,
        date,
        endDate,
        startTime,
        endTime,
        description,
        URL,
        includeChat,
      },
      coHosts: coHosts.map((id) => ({
        user: id,
        status: "read-only",
      })),
      guests: guests,
      interests: interests,
      questions: questions,
      additionalField: additionalField,
    };
    console.log("objToSave", objToSave);
    const createdEvent = await Models.eventModel.create(objToSave);
    return res.status(201).json({
      status: true,
      message: "Event created successfully",
      event: createdEvent,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

exports.getEventById = (req, res) => {
  // Logique pour le login
  res.send("Get event by id");
};

exports.getUpcomingEvents = async (req, res) => {
  try {
    console.log("Start getting getAllUpcomingPublicEvents");
    const currentDate = new Date();

    // Récupération des événements publics à venir
    const events = await Event.find({
      eventType: "public",
      "details.date": { $gt: currentDate },
    })
      .populate({
        path: "user",
        select: "firstName lastName profileImage",
      })
      .populate({
        path: "coHosts",
        select: "firstName lastName profileImage",
      })
      .populate({
        path: "guests",
        select: "firstName lastName profileImage",
      })
      .populate({
        path: "interest",
        select: "name image _id",
      })
      .exec();

    let enrichedEvents = events.map((event) => ({
      ...event.toObject(),
      isGoing: false, // Default to false
      isFavourite: false, // Default to false
    }));

    if (req.user) {
      // Récupération des participations de l'utilisateur connecté
      const attendeeStatus = await EventAttendee.find({
        userId: req.user._id,
        eventId: { $in: events.map((event) => event._id) },
      }).exec();

      const favoriteStatus = await EventFavorite.find({
        userId: req.user._id,
        eventId: { $in: events.map((event) => event._id) },
      }).exec();

      const goingStatusMap = {};
      attendeeStatus.forEach((status) => {
        goingStatusMap[status.eventId] = status.attendEvent === 1;
      });

      const favouriteStatusMap = {};
      favoriteStatus.forEach((status) => {
        favouriteStatusMap[status.eventId] = status.favourite === 1;
      });

      enrichedEvents = events.map((event) => {
        const isGoing = !!goingStatusMap[event._id];
        const isFavourite = !!favouriteStatusMap[event._id];
        return {
          ...event.toObject(),
          isGoing,
          isFavourite,
        };
      });
    }
    res.status(200).json({
      success: true,
      message: "Upcoming public events retrieved successfully",
      data: enrichedEvents,
    });
  } catch (error) {
    console.error("Error in getAllUpcomingPublicEvents controller: ", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve upcoming public events",
      error: error.message,
    });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    //Fistly check created event is by logged in user or not
    let checkEvent = await Models.eventModel.findOne({ _id: req.params.id });
    if (checkEvent.user.toString() == req.user._id.toString()) {
      let eventDelete = await Models.eventModel.deleteOne({
        _id: req.params.id,
      });
      if (eventDelete) {
        await Models.eventAttendesUserModel.deleteMany({
          eventId: req.params.id,
        });
        await Models.RSVPSubmission.deleteMany({ eventId: req.params.id });
        await Models.coHostModel.deleteOne({ eventId: req.params.id });
        await Models.eventNotificationModel.deleteMany({
          eventId: req.params.id,
        });
        return helper.success(res, "Event delete successfuly");
      }
    }
    return helper.success(res, "This event is not created by you");
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
