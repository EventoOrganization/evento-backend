const Event = require("../models/eventModel");
const User = require("../models/userModel");

exports.getSitemapData = async (req, res) => {
  try {
    // Récupérer les IDs des événements et des profils
    const events = await Event.find({}, "_id");
    const profiles = await User.find({}, "_id");

    // Formatage des données pour le sitemap
    const data = {
      events: events.map((event) => event._id.toString()),
      profiles: profiles.map((profile) => profile._id.toString()),
    };
    console.log(data);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error generating sitemap data:", error);
    res.status(500).json({ error: "Failed to fetch sitemap data" });
  }
};
