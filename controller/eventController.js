const Event = require("../models/eventModel");
exports.createEvent = (req, res) => {
  // Logique pour le signup
  res.send("Created event");
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
        path: "interest", // Populate the interest field
        select: "name image _id", // Select only the name of the interest
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

    // Enveloppe de la réponse avec des métadonnées
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
