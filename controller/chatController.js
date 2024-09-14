const Models = require("../models");
const helper = require("../helper/helper");
const { sendEventInviteEmail } = require("../helper/emailService");

exports.myEventsWithChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const events = await Models.eventModel
      .find({
        $or: [
          { user: userId },
          { coHosts: { $in: [userId] } },
          { guests: { $in: [userId] } },
          { attendees: { $in: [userId] } },
        ],
        "details.includeChat": true,
      })
      .populate("user", "firstName lastName name")
      .lean(); // Ajouter .lean() pour manipuler les objets retournés

    // Ajouter le rôle de l'utilisateur à chaque événement
    const eventsWithRole = events.map((event) => {
      let role = "Participant";
      if (event.user._id.equals(userId)) {
        role = "Host";
      } else if (event.coHosts.includes(userId)) {
        role = "Co-Host";
      } else if (event.guests.includes(userId)) {
        role = "Guest";
      } else if (event.attendees.includes(userId)) {
        role = "Attendee";
      }

      return {
        ...event,
        userRole: role,
      };
    });

    return res.status(200).json({ status: true, events: eventsWithRole });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
