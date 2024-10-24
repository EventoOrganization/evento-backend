const Event = require("../models/eventModel");
const Models = require("../models");
const helper = require("../helper/helper");
const {
  sendEventInviteEmail,
  sendUpdateNotification,
} = require("../helper/emailService");
const TempGuest = require("../models/tempGuestModel");
const moment = require("moment");

exports.deletePostEventMedia = async (req, res) => {
  const { eventId } = req.params;
  const { currentMediaIndex } = req.body;

  if (!eventId || currentMediaIndex === undefined) {
    // Ensure currentMediaIndex is not undefined
    return res
      .status(400)
      .json({ message: "Missing eventId or currentMediaIndex" });
  }

  try {
    // Fetch the event by ID
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if the currentMediaIndex is valid
    if (
      currentMediaIndex < 0 ||
      currentMediaIndex >= event.postEventMedia.length
    ) {
      return res.status(400).json({ message: "Invalid media index" });
    }

    // Remove the media item at the given index
    event.postEventMedia.splice(currentMediaIndex, 1);

    // Save the updated event
    await event.save();

    // Success response
    return res
      .status(200)
      .json({ message: "Media deleted from database successfully" });
  } catch (error) {
    console.error("Error deleting media from DB:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
exports.addGuests = async (req, res) => {
  const eventId = req.params.id;
  const { guests, tempGuests, user } = req.body;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found." });
    }
    const eventLink = `${process.env.CLIENT_URL}/event/${eventId}`;
    const invitedBy = user._id;
    // Ajout des utilisateurs existants
    if (guests && guests.length > 0) {
      for (const guest of guests) {
        const guestId = typeof guest === "string" ? guest : guest.id;
        if (!event.guests.includes(guestId)) {
          event.guests.push(guestId);
          const guestUser = await Models.userModel.findById(guestId);
          if (guestUser) {
            const guest = {
              _id: guestId,
              username: guestUser.username,
              email: guestUser.email,
            };
            console.log("email send to", guest);
            await sendEventInviteEmail(user, guest, event, eventLink);
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
        const guest = {
          _id: tempGuest._id,
          username: tempGuest.username,
          email: tempGuest.email,
        };
        console.log("email send to", guest);
        await sendEventInviteEmail(user, guest, event, eventLink);
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
exports.storePostEventMedia = async (req, res) => {
  const { eventId, media } = req.body;

  try {
    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      {
        $push: { postEventMedia: media },
      },
      { new: true },
    );

    res.status(200).json({
      success: true,
      data: updatedEvent,
      message: "Post-event media added successfully.",
    });
  } catch (error) {
    console.error("Error adding post-event media:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add post-event media",
    });
  }
};
exports.toggleUploadMedia = async (req, res) => {
  const { eventId, allow } = req.body;
  if (!eventId || typeof allow !== "boolean") {
    return res.status(400).json({ message: "Invalid request data" });
  }
  try {
    // Find the event by ID and update the allUploadPhotoVideo field
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    event.allUploadPhotoVideo = allow;
    await event.save();
    return res.status(200).json({ success: true, event });
  } catch (error) {
    console.error("Error updating event:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
exports.unGuestUser = async (req, res) => {
  console.log("body", req.body);
  try {
    const { userId, eventId } = req.body;

    // Check if the user ID and event ID are provided
    if (!userId || !eventId) {
      return res.status(400).json({
        status: false,
        message: "User ID and Event ID are required",
      });
    }

    // Find the event by event ID
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        status: false,
        message: "Event not found",
      });
    }

    // Check if the user is in the 'guests' or 'tempGuests' array of the event
    const userIndex = event.guests.indexOf(userId);
    const tempGuestIndex = event.tempGuests.indexOf(userId);

    // If the user is in the guests array, remove them
    if (userIndex !== -1) {
      event.guests.splice(userIndex, 1);
    }

    // If the user is in the tempGuests array, remove them
    if (tempGuestIndex !== -1) {
      event.tempGuests.splice(tempGuestIndex, 1);
    }

    // Save the event with the updated guests/tempGuests
    await event.save();

    return res.status(200).json({
      status: true,
      message: "User is no longer a guest for this event",
    });
  } catch (error) {
    console.error("Error in un-guest user:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating the event",
      error: error.message,
    });
  }
};
exports.updateEventField = async (req, res) => {
  const { eventId } = req.params;
  const { field, value } = req.body;

  if (!field || value === undefined) {
    return res.status(400).json({ message: "Missing field or value" });
  }

  try {
    const event = await Models.eventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Pour vérifier si des changements critiques ont été faits
    let oldData = {};
    let changeType = "";

    switch (field) {
      case "title":
        event.title = value;
        break;
      case "locationData":
        oldData = { location: event.details.location };
        event.details.location = value.location;
        event.details.loc.coordinates = [value.longitude, value.latitude];
        changeType = "location";
        break;
      case "description":
        event.details.description = value;
        break;
      case "eventType":
        event.eventType = value;
        break;
      case "mode":
        event.details.mode = value;
        break;
      case "interests":
        event.interests = value.map((interest) => interest._id);
        break;
      case "url":
        event.details.URLlink = value;
        break;
      case "date":
        oldData = {
          date: event.details.date,
          endDate: event.details.endDate,
          startTime: event.details.startTime,
          endTime: event.details.endTime,
          timeSlots: event.details.timeSlots,
        };
        event.details.date = value.startDate;
        event.details.endDate = value.endDate;
        event.details.startTime = value.startTime;
        event.details.endTime = value.endTime;
        event.details.timeSlots = value.timeSlots;
        changeType = "date/time";
        break;
      default:
        console.log("Invalid field specified");
        return res.status(400).json({ message: "Invalid field" });
    }

    await event.save();

    if (changeType) {
      const goingStatuses = await Models.eventStatusSchema
        .find({
          eventId: eventId,
          status: "isGoing",
        })
        .populate("userId");

      const goingUsers = goingStatuses.map((status) => status.userId);
      await sendUpdateNotification(goingUsers, event, changeType, oldData);
    }

    res.status(200).json({ message: `${field} updated successfully`, event });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
exports.updateGuestsAllowFriend = async (req, res) => {
  try {
    const eventId = req.params.id;
    const { guestsAllowFriend } = req.body;
    // Vérifiez que l'utilisateur qui fait la requête est l'hôte de l'événement
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        status: false,
        message: "Event not found",
      });
    }

    // Vérifiez que l'utilisateur est l'hôte
    if (event.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: false,
        message: "You do not have permission to update this event",
      });
    }

    // Mettre à jour la propriété guestsAllowFriend
    event.guestsAllowFriend = guestsAllowFriend;
    await event.save();

    return res.status(200).json({
      status: true,
      message: "guestsAllowFriend updated successfully",
      data: event,
    });
  } catch (error) {
    console.error("Error updating guestsAllowFriend:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating guestsAllowFriend",
      error: error.message,
    });
  }
};
exports.createEvent = async (req, res) => {
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
      questions,
      additionalField,
      URL,
      includeChat,
      createRSVP,
    } = req.body;

    // Handle media for event
    let initialMedia = [];
    const imageUrls = uploadedMedia
      .filter((media) => media.type === "image")
      .map((media) => ({ url: media.url, type: "image" }));
    const videoUrls = uploadedMedia
      .filter((media) => media.type === "video")
      .map((media) => ({ url: media.url, type: "video" }));
    initialMedia = [...imageUrls, ...videoUrls];

    console.log("Initial Media (Images and Videos):", initialMedia);

    // Step 1: Save the event first (without co-hosts)
    const objToSave = {
      user: req.user._id,
      title,
      eventType,
      details: {
        username,
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
        createRSVP,
        timeSlots: req.body.timeSlots,
      },
      initialMedia,
      guests,
      interests,
      questions,
      additionalField,
    };

    const createdEvent = await Models.eventModel.create(objToSave);
    const fullUser = await Models.userModel
      .findById(req.user._id)
      .select("_id username firstName lastName profileImage");
    if (fullUser) {
      createdEvent.user = fullUser; // Assign the full user object instead of just the user ID
    }
    const eventLink = `${process.env.CLIENT_URL}/event/${createdEvent._id}`;
    const usernameFrom = req.user.username;

    // Step 2: Create the coHosts and associate them with the created event
    let coHosts = [];
    if (Array.isArray(req.body.coHosts) && req.body.coHosts.length > 0) {
      coHosts = await Promise.all(
        req.body.coHosts.map(async (coHost) => {
          const newCohost = await Models.coHostModel.create({
            user_id: coHost.userId,
            event_id: createdEvent._id, // Use the ID of the created event here
            status: coHost.status || "read-only",
          });
          return newCohost._id; // Return the ObjectId of the co-host
        }),
      );

      // Update event with the co-hosts' references
      createdEvent.coHosts = coHosts;
      await createdEvent.save();
    }

    // Step 3: Send email to each co-host
    for (const coHostId of coHosts) {
      // First, retrieve the co-host document using its ObjectId
      const coHostDoc = await Models.coHostModel.findById(coHostId);
      if (coHostDoc) {
        // Then retrieve the user details using the user_id from the co-host document
        const coHostUser = await Models.userModel.findById(coHostDoc.user_id);

        if (coHostUser) {
          const emailTo = coHostUser.email;
          const usernameTo = coHostUser.username;

          await sendEventInviteEmail(
            req.user,
            coHostUser,
            createdEvent,
            eventLink,
            true,
          );
        }
      }
    }

    // Step 4: Handle group chat creation if necessary
    if (includeChat) {
      const initialUsers = [req.user.id, ...coHosts];
      const saveData = {
        eventId: createdEvent._id,
        admin: req.user._id,
        users: initialUsers,
        groupName: createdEvent.title,
        image:
          createdEvent.initialMedia.length > 0
            ? initialMedia[0].url
            : req.user.profileImage,
        date: moment().format("YYYY-MM-DD"),
        time: moment().format("LTS"),
      };

      try {
        const createdGroupChat = await Models.groupChatModel.create(saveData);

        const createdChatConstant = await Models.chatconstant.create({
          senderId: req.user._id,
          groupId: createdGroupChat._id,
          groupUserIds: initialUsers,
          lastmessage: null,
          is_delete: 0,
          is_favourite: 0,
          is_block: 0,
          unreadCount: 0,
          date: moment().format("YYYY-MM-DD"),
          time: moment().format("LTS"),
        });
      } catch (error) {
        console.error("Error creating group chat or chat constant:", error);
      }
    }

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

    // Récupère l'événement avec les populations nécessaires
    const event = await Event.findById(eventId)
      .populate("user", "username email profileImage")
      .populate("interests", "_id name")
      .populate("guests", "username email profileImage")
      .populate("tempGuests", "username email")
      .populate({
        path: "coHosts",
        populate: {
          path: "user_id",
          select: "username email profileImage",
        },
      })
      .exec();

    if (!event) {
      return res.status(404).json({
        status: false,
        message: "Event not found",
      });
    }

    // Si l'utilisateur n'est pas authentifié, retourne simplement l'événement
    if (!req.query.userId) {
      return res.status(200).json({
        status: true,
        message: "Event retrieved successfully",
        data: event,
      });
    }

    const userId = req.query.userId;

    // Récupère le statut de l'utilisateur pour cet événement depuis le nouveau schema `eventStatusSchema`
    const eventStatus = await Models.eventStatusSchema.findOne({
      eventId,
      userId,
    });

    let isGoing = false;
    let isFavourite = false;
    let isRefused = false;

    if (eventStatus) {
      // Définir le statut en fonction du statut trouvé
      if (eventStatus.status === "isGoing") {
        isGoing = true;
      } else if (eventStatus.status === "isFavourite") {
        isFavourite = true;
      } else if (eventStatus.status === "isRefused") {
        isRefused = true;
      }
    }

    // Récupère les invités enrichis avec les informations de suivi
    const followingList = await Models.userFollowModel.find({
      follower: userId,
    });
    const followersList = await Models.userFollowModel.find({
      following: userId,
    });

    const followingMap = new Map();
    followingList.forEach((follow) => {
      followingMap.set(follow.following.toString(), true);
    });

    const followersMap = new Map();
    followersList.forEach((follow) => {
      followersMap.set(follow.follower.toString(), true);
    });

    const addFollowStatus = (user) => {
      if (!user) return null;
      const userIdStr = user._id.toString();
      return {
        ...user.toObject(),
        isIFollowingHim: followingMap.has(userIdStr),
        isFollowingMe: followersMap.has(userIdStr),
      };
    };

    const enrichedGuests = event.guests
      ? event.guests.map((guest) => addFollowStatus(guest))
      : [];
    const enrichedTempGuests = event.tempGuests
      ? event.tempGuests.map((tempGuest) => ({
          ...tempGuest.toObject(),
          isIFollowingHim: false,
          isFollowingMe: false,
        }))
      : [];

    const hostStatus = event.user._id.toString() === userId.toString();
    const isCoHost = event.coHosts.some(
      (coHost) =>
        coHost.user && coHost.user._id.toString() === userId.toString(),
    );

    const enrichedEvent = {
      ...event.toObject(),
      guests: enrichedGuests,
      tempGuests: enrichedTempGuests,
      isGoing,
      isFavourite,
      isRefused,
      isCoHost,
      isHosted: hostStatus,
    };

    return res.status(200).json({
      status: true,
      message: "Event retrieved successfully",
      data: enrichedEvent,
    });
  } catch (error) {
    console.error("Error retrieving event:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while retrieving the event",
      error: error.message,
    });
  }
};
exports.getRSVPAndReasons = async (req, res) => {
  const { eventId } = req.params;

  try {
    // Récupérer les utilisateurs avec des réponses RSVP (status 'isGoing')
    const rsvpSubmissions = await Models.eventStatusSchema
      .find({
        eventId: eventId,
        status: "isGoing",
      })
      .populate("userId", "username profileImage")
      .select("userId rsvpAnswers");

    // Récupérer les utilisateurs qui ont refusé l'invitation (status 'isRefused') avec la raison
    const refusedStatuses = await Models.eventStatusSchema
      .find({
        eventId: eventId,
        status: "isRefused",
      })
      .populate("userId", "username profileImage")
      .select("userId reason");

    // Structurer la réponse
    res.status(200).json({
      success: true,
      data: {
        rsvpSubmissions, // Utilisateurs avec RSVP et leurs réponses
        refusedStatuses, // Utilisateurs qui ont refusé et leurs raisons
      },
    });
  } catch (error) {
    console.error("Error fetching RSVP and refused info:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch RSVP and refused info",
      error: error.message,
    });
  }
};
exports.getUpcomingEvents = async (req, res) => {
  try {
    const userId = req.query.userId;
    const currentDate = new Date();

    // Récupérer les événements publics et privés à venir
    const events = await Event.find({
      $or: [
        { eventType: "public", "details.endDate": { $gt: currentDate } },
        {
          eventType: "private",
          "details.endDate": { $gt: currentDate },
          $or: [
            { user: userId }, // host
            { guests: userId }, // guest
            { tempGuests: userId }, // temp guest
            { coHosts: { $elemMatch: { user_id: userId } } }, // cohost
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("user", "username firstName lastName profileImage")
      .populate({
        path: "coHosts",
        populate: {
          path: "user_id",
          select: "username email profileImage",
        },
      })
      .populate("guests", "username firstName lastName profileImage")
      .populate("interests", "name image")
      .exec();

    // Préparer un tableau pour contenir les événements enrichis
    let enrichedEvents = events.map((event) => ({
      ...event.toObject(),
      isGoing: false,
      isFavourite: false,
      isRefused: false,
      attendees: [],
      favouritees: [],
      refused: [],
    }));

    // Récupérer les IDs des événements pour chercher les statuts d'événements
    const eventIds = events.map((event) => event._id);

    // Récupérer les statuts d'événements associés à ces événements
    const eventStatuses = await Models.eventStatusSchema
      .find({
        eventId: { $in: eventIds },
      })
      .populate("userId", "username profileImage") // Peupler les infos de l'utilisateur
      .exec();

    // Construire une map des statuts par événement
    const statusMap = {};
    eventStatuses.forEach((status) => {
      if (!statusMap[status.eventId]) {
        statusMap[status.eventId] = {
          attendees: [],
          favouritees: [],
          refused: [],
        };
      }

      // Ajouter les utilisateurs dans les tableaux appropriés selon leur statut
      if (status.status === "isGoing") {
        statusMap[status.eventId].attendees.push(status.userId);
      } else if (status.status === "isFavourite") {
        statusMap[status.eventId].favouritees.push(status.userId);
      } else if (status.status === "isRefused") {
        statusMap[status.eventId].refused.push(status.userId);
      }
    });

    // Enrichir les événements avec les statuts d'utilisateurs pour l'utilisateur connecté
    if (userId) {
      enrichedEvents = enrichedEvents.map((event) => {
        const userStatus = statusMap[event._id] || {
          attendees: [],
          favouritees: [],
          refused: [],
        };

        // Vérifier si l'utilisateur connecté est dans les tableaux
        const isGoing = userStatus.attendees.some(
          (user) => user._id.toString() === userId,
        );
        const isFavourite = userStatus.favouritees.some(
          (user) => user._id.toString() === userId,
        );
        const isRefused = userStatus.refused.some(
          (user) => user._id.toString() === userId,
        );

        const isHosted = event.user._id.toString() === userId;

        return {
          ...event,
          isGoing,
          isFavourite,
          isRefused,
          attendees: userStatus.attendees || [], // Liste des utilisateurs qui sont "isGoing"
          favouritees: userStatus.favouritees || [], // Liste des utilisateurs qui sont "isFavourite"
          refused: userStatus.refused || [], // Liste des utilisateurs qui ont "refusé"
          isHosted,
        };
      });
    }

    // Répondre avec les événements enrichis
    res.status(200).json({
      success: true,
      message: "Upcoming events retrieved successfully",
      data: enrichedEvents,
    });
  } catch (error) {
    console.error("Error in getUpcomingEvents controller:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve upcoming events",
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
        await Models.groupChatModel.deleteOne({ eventId: req.params.id });
        await Models.chatconstant.deleteMany({ groupId: req.params.id });
        return helper.success(res, "Event delete successfuly");
      }
    }
    return helper.success(res, "This event is not created by you");
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
exports.updateEventStatus = async (req, res) => {
  const { eventId, userId, status, rsvpAnswers, reason } = req.body;

  try {
    // Vérifier si l'utilisateur essaie de retirer un statut en envoyant null
    if (!status) {
      // Supprimer l'entrée du statut si le statut est null
      await Models.eventStatusSchema.deleteOne({ eventId, userId });
      return res.status(200).json({
        success: true,
        message: "Event status removed successfully",
      });
    }

    // Mettre à jour ou créer un nouveau statut
    const eventStatus = await Models.eventStatusSchema.findOneAndUpdate(
      { eventId, userId },
      { status, rsvpAnswers, reason },
      { new: true, upsert: true, runValidators: true }, // Crée un nouveau statut si aucun n'existe
    );

    res.status(200).json({
      success: true,
      message: "Event status updated successfully",
      data: eventStatus,
    });
  } catch (error) {
    console.error("Error updating event status:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the event status",
      error: error.message,
    });
  }
};
