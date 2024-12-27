require("dotenv").config();
const moment = require("moment");
const mongoose = require("mongoose");
const Models = require("./models");
const { sendEventReminderEmail } = require("./helper/mailjetEmailService");

(async function testEventReminderJob() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const oneDayBefore = moment.utc().add(1, "days").startOf("day");
    const endOfDay = moment.utc().add(1, "days").endOf("day");

    const upcomingEvents = await Models.eventModel
      .find({
        "details.date": {
          $gte: new Date(oneDayBefore),
          $lt: new Date(endOfDay),
        },
      })
      .populate("user", "username profileImage")
      .populate("coHosts.userId", "username profileImage");

    if (upcomingEvents.length === 0) {
      await mongoose.disconnect();
      return;
    }

    for (const event of upcomingEvents) {
      const goingStatuses = await Models.eventStatusSchema
        .find({
          eventId: event._id,
          status: "isGoing",
        })
        .populate("userId");

      const goingUsers = goingStatuses.map((status) => status.userId);

      for (const recipient of goingUsers) {
        if (recipient) {
          await sendEventReminderEmail(recipient, event);
        }
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error in event reminder job:", error);
    await mongoose.disconnect();
  }
})();
