const Event = require("../models/eventModel");
const Models = require("../models");
const helper = require("../helper/helper");
const { sendEventInviteEmail } = require("../helper/emailService");
const TempGuest = require("../models/tempGuestModel");
exports.addGuests = async (req, res) => {
  const eventId = req.params.id;
  const { guests, tempGuests, user } = req.body;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }
    const eventLink = `${process.env.CLIENT_URL}/events/${eventId}`;
    const usernameFrom = user.username;
    const invitedBy = user._id;
    // Ajout des utilisateurs existants
    if (guests && guests.length > 0) {
      for (const guest of guests) {
        const guestId = typeof guest === "string" ? guest : guest.id;
        if (!event.guests.includes(guestId)) {
          event.guests.push(guestId);
          const guestUser = await Models.userModel.findById(guestId);
          if (guestUser) {
            const emailTo = guestUser.email;
            const usernameTo = guestUser.username;
            console.log(
              `Sending invitation email to ${usernameTo} at ${emailTo} from ${usernameFrom} at ${eventLink}`,
            );
            await sendEventInviteEmail(
              usernameFrom,
              emailTo,
              usernameTo,
              eventLink,
            );
          }
        }
      }
    }

    // Ajout des utilisateurs temporaires
    if (tempGuests && tempGuests.length > 0) {
      for (const tempGuestData of tempGuests) {
        const { email, username } = tempGuestData;
        const existingUser = await Models.userModel.findOne({ email });
        if (existingUser) {
          // Si l'utilisateur existe, l'ignorer et continuer avec le suivant
          console.log(`User with email ${email} already exists, skipping...`);
          continue;
        }
        let tempGuest = await TempGuest.findOne({ email });

        if (!tempGuest) {
          // Créer un nouvel utilisateur temporaire si aucun n'existe
          tempGuest = new TempGuest({
            email,
            username,
            invitations: [
              { eventId, invitedBy }, // Ajout de l'invitation
            ],
          });
          await tempGuest.save();
        } else {
          // Si l'invité temporaire existe déjà, ajouter l'invitation à la liste
          tempGuest.invitations.push({ eventId, invitedBy });
          await tempGuest.save();
        }

        // Ajouter la référence du tempGuest à l'événement
        if (!event.tempGuests.includes(tempGuest._id)) {
          event.tempGuests.push(tempGuest._id);
        }
        const emailTo = email;
        const usernameTo = username;
        console.log(
          `Sending invitation email to ${usernameTo} at ${email} from ${usernameFrom} at ${eventLink}`,
        );
        await sendEventInviteEmail(
          usernameFrom,
          emailTo,
          usernameTo,
          eventLink,
        );
      }
    }

    // Sauvegarder les modifications de l'événement
    await event.save();

    res.status(200).json({ message: "Guests added successfully.", event });
  } catch (error) {
    console.error("Error adding guests:", error);
    res.status(500).json({ message: "Server error." });
  }
};
exports.createEvent = async (req, res) => {
  // console.log("req.body", req.body);
  console.log("req.files", req.files);
  try {
    const {
      title,
      username,
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
      !username ||
      !eventType ||
      !mode ||
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
    const coHosts = req.body.coHosts.map((coHost) => ({
      user: coHost.userId,
      status: coHost.status || "read-only",
    }));
    let initialMedia = [];

    // Pour les images
    const imageUrls = uploadedMedia
      .filter((media) => media.type === "image")
      .map((media) => ({
        url: media.url,
        type: "image",
      }));

    // Pour les vidéos
    const videoUrls = uploadedMedia
      .filter((media) => media.type === "video")
      .map((media) => ({
        url: media.url,
        type: "video",
      }));

    initialMedia = [...imageUrls, ...videoUrls];
    const objToSave = {
      user: req.user._id,
      title,
      eventType,
      details: {
        username,
        // images: imageUrls,
        // videos: videoUrls,
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
        URLlink: URL,
        includeChat,
        timeSlots: req.body.timeSlots,
      },
      initialMedia: initialMedia,
      coHosts: coHosts,
      guests: guests,
      interests: interests,
      questions: questions,
      additionalField: additionalField,
    };
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
exports.getEventById = async (req, res) => {
  try {
    const eventId = req.params.id;

    // Fetch the event with all necessary populations
    const event = await Event.findById(eventId)
      .populate("user", "username email profileImage")
      .populate("interests", "_id name")
      .populate({
        path: "coHosts",
        populate: {
          path: "user_id",
          select: "username email profileImage",
        },
      })
      .populate("guests", "username email profileImage")
      .populate("tempGuests", "username email")
      .exec();

    if (!event) {
      return res.status(404).json({
        status: false,
        message: "Event not found",
      });
    }

    let isGoing = false;
    let isFavourite = false;
    let isRefused = false;
    let isAdmin = false;
    let isHosted = false;
    let isCoHost = false;

    const refused = await Models.eventRefuseModel
      .find({ eventId, refused: 1 })
      .populate("userId", "username firstName lastName profileImage")
      .exec();

    const attendees = await Models.eventAttendesUserModel
      .find({ eventId, attendEvent: 1 })
      .populate("userId", "username firstName lastName profileImage")
      .exec();

    const favouritees = await Models.eventFavouriteUserModel
      .find({ eventId, favourite: 1 })
      .populate("userId", "username firstName lastName profileImage")
      .exec();

    if (req.query.userId) {
      const userId = req.query.userId;

      // Fetch the following and followers list
      const followingList = await Models.userFollowModel.find({
        follower: userId,
      });
      const followersList = await Models.userFollowModel.find({
        following: userId,
      });

      // Create maps for following and followers status
      const followingMap = new Map();
      followingList.forEach((follow) => {
        followingMap.set(follow.following.toString(), true);
      });

      const followersMap = new Map();
      followersList.forEach((follow) => {
        followersMap.set(follow.follower.toString(), true);
      });

      // Helper function to add follow status
      const addFollowStatus = (user) => {
        if (!user) return null; // Si l'utilisateur est null, renvoyez null.
        const userIdStr = user._id.toString();
        return {
          ...user.toObject(),
          isIFollowingHim: followingMap.has(userIdStr),
          isFollowingMe: followersMap.has(userIdStr),
        };
      };

      // Enrich coHosts with follow status if coHosts exist
      const enrichedCoHosts = event.coHosts
        ? event.coHosts.map((coHost) => ({
            ...coHost,
            user: addFollowStatus(coHost.user),
          }))
        : [];

      // Enrich guests with follow status if guests exist
      const enrichedGuests = event.guests
        ? event.guests.map((guest) => addFollowStatus(guest))
        : [];

      // Enrich tempGuests (these don't have follow status) if they exist
      const enrichedTempGuests = event.tempGuests
        ? event.tempGuests.map((tempGuest) => ({
            ...tempGuest.toObject(),
            isIFollowingHim: false,
            isFollowingMe: false,
          }))
        : [];

      // Enrich attendees with follow status if attendees exist
      const enrichedAttendees = attendees
        ? attendees.map((attendee) => addFollowStatus(attendee.userId))
        : [];

      // Enrich favouritees with follow status if favouritees exist
      const enrichedFavouritees = favouritees
        ? favouritees.map((favourite) => addFollowStatus(favourite.userId))
        : [];

      // Enrich refused users with follow status if refused exist
      const enrichedRefused = refused
        ? refused.map((refuse) => addFollowStatus(refuse.userId))
        : [];

      // Check statuses for the logged-in user
      const attendeeStatus = await Models.eventAttendesUserModel
        .findOne({ userId, eventId, attendEvent: 1 })
        .exec();

      const favouriteStatus = await Models.eventFavouriteUserModel
        .findOne({ userId, eventId, favourite: 1 })
        .exec();

      const refuseStatus = await Models.eventRefuseModel
        .findOne({ userId, eventId, refused: 1 })
        .exec();

      const adminStatus = await Models.coHostModel.findOne({
        eventId,
        userId,
        status: "admin",
      });

      if (
        event.coHosts &&
        event.coHosts.some(
          (coHost) => coHost.user._id.toString() === userId.toString(),
        )
      ) {
        isCoHost = true;
      }

      const hostStatus = event.user._id.toString() === userId.toString();

      isRefused = !!refuseStatus;
      isGoing = !!attendeeStatus;
      isFavourite = !!favouriteStatus;
      isAdmin = !!adminStatus;
      isHosted = !!hostStatus;

      // Build the enriched event object
      const enrichedEvent = {
        ...event.toObject(),
        coHosts: enrichedCoHosts,
        guests: enrichedGuests,
        tempGuests: enrichedTempGuests,
        attendees: enrichedAttendees,
        favouritees: enrichedFavouritees,
        refused: enrichedRefused,
        coHostStatus: isCoHost,
        isGoing,
        isFavourite,
        isRefused,
        isAdmin,
        isHosted,
      };

      // Return the enriched event
      return res.status(200).json({
        status: true,
        message: "Event retrieved successfully",
        data: enrichedEvent,
      });
    }
  } catch (error) {
    console.error("Error retrieving event:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving the event",
      error: error.message,
    });
  }
};
exports.getUpcomingEvents = async (req, res) => {
  try {
    console.log("Start getting getAllUpcomingPublicEvents");
    const currentDate = new Date();
    // Récupération des événements publics à venir
    const events = await Event.find({
      eventType: "public",
      "details.endDate": { $gt: currentDate },
    })
      .sort({ createdAt: -1 })
      .populate("user", "username firstName lastName profileImage")
      .populate("coHosts", " usernamefirstName lastName profileImage")
      .populate("guests", " usernamefirstName lastName profileImage")
      .populate("interests", "name image")
      .exec();
    let enrichedEvents = events.map((event) => ({
      ...event.toObject(),
      isGoing: false,
      isFavourite: false,
    }));
    // add LoggedUser's status
    if (req.query.userId) {
      const attendeeStatus = await Models.eventAttendesUserModel
        .find({
          userId: req.query.userId,
          eventId: { $in: events.map((event) => event._id) },
        })
        .exec();

      const favoriteStatus = await Models.eventFavouriteUserModel
        .find({
          userId: req.query.userId,
          eventId: { $in: events.map((event) => event._id) },
        })
        .exec();
      if (attendeeStatus && Array.isArray(attendeeStatus)) {
        const goingStatusMap = {};
        attendeeStatus.forEach((status) => {
          if (status && status.eventId) {
            goingStatusMap[status.eventId] = status.attendEvent === 1;
          }
        });

        const favouriteStatusMap = {};
        if (favoriteStatus && Array.isArray(favoriteStatus)) {
          favoriteStatus.forEach((status) => {
            if (status && status.eventId) {
              favouriteStatusMap[status.eventId] = status.favourite === 1;
            }
          });
        }

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
exports.attendEventStatus = async (req, res) => {
  try {
    let objToSave = {
      eventId: req.body.eventId,
      userId: req.user._id,
      attendEvent: 1,
    };

    let findGroup = {
      eventId: req.body.eventId,
    };
    var checkGroupHas = await Models.groupChatModel.findOne(findGroup);
    let findData = await Models.eventAttendesUserModel.findOne(objToSave);
    if (!findData) {
      let save = await Models.eventAttendesUserModel.create(objToSave);

      if (checkGroupHas) {
        const update = {
          $addToSet: {
            users: req.user._id, // Changed data.userId to req.user._id
          },
        };
        await Models.groupChatModel.findByIdAndUpdate(
          checkGroupHas._id,
          update,
          { new: true }, // This option returns the updated document
        );
      }
      return helper.success(
        res,
        "Event attendees confirmation sent successfully",
        save,
      );
    } else {
      let save = await Models.eventAttendesUserModel.deleteOne(objToSave);
      if (checkGroupHas) {
        await Models.groupChatModel.findByIdAndUpdate(
          checkGroupHas._id,
          { $pull: { users: req.user._id } }, // Changed data.userId to req.user._id
          { new: true },
        );
      }
      return helper.success(
        res,
        "Event attendees confirmation deleted successfully",
        save,
      );
    }
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message });
  }
};
exports.favouriteEventStatus = async (req, res) => {
  try {
    let objToSave = {
      favourite: 1,
      eventId: req.body.eventId,
      userId: req.user._id,
    };
    //Firstly find if exist then delete other wise create
    let findData = await Models.eventFavouriteUserModel.findOne(objToSave);
    if (!findData) {
      let save = await Models.eventFavouriteUserModel.create(objToSave);
      return helper.success(res, "Event Favourite", save);
    } else {
      let save = await Models.eventFavouriteUserModel.deleteOne(objToSave);
      return helper.success(res, "Event not favourite", save);
    }
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message });
  }
};
exports.refusedEventStatus = async (req, res) => {
  try {
    // Search for an existing refusal status by userId and eventId only
    let objToFind = {
      eventId: req.body.eventId,
      userId: req.user._id,
    };

    // Find if the refusal status already exists
    let findData = await Models.eventRefuseModel.findOne(objToFind);

    // If it doesn't exist, create a new refusal record
    if (!findData) {
      let objToSave = {
        refused: 1,
        eventId: req.body.eventId,
        reason: req.body.reason ? req.body.reason : "",
        userId: req.user._id,
      };

      let save = await Models.eventRefuseModel.create(objToSave);
      return helper.success(res, "Event Refused", save);
    } else {
      // If it exists, delete the refusal status (toggle off)
      let save = await Models.eventRefuseModel.deleteOne(objToFind);
      return helper.success(res, "Event not Refused", save);
    }
  } catch (error) {
    return res.status(401).json({ status: false, message: error.message });
  }
};
