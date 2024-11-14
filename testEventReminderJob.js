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

    console.log("Connected to MongoDB...");

    // Calculer la date dans 2 jours
    const twoDaysFromNow = moment.utc().add(1, "days").startOf("day");
    const endOfDay = moment.utc().add(1, "days").endOf("day");

    console.log(
      `Checking events scheduled between: ${twoDaysFromNow.format()} and ${endOfDay.format()}`,
    );

    const upcomingEvents = await Models.eventModel.find({
      "details.date": {
        $gte: new Date(twoDaysFromNow),
        $lt: new Date(endOfDay),
      },
    });

    console.log(`Found ${upcomingEvents.length} upcoming events`);

    console.log(`Found ${upcomingEvents.length} upcoming events`);

    if (upcomingEvents.length === 0) {
      console.log("No events found for the specified date.");
      return;
    }

    for (const event of upcomingEvents) {
      let uniqueParticipants = new Set();

      // Récupérer les participants
      const attendees = await Models.eventAttendesUserModel.find({
        eventId: event._id,
      });
      attendees.forEach((attendee) =>
        uniqueParticipants.add(attendee.userId.toString()),
      );

      event.coHosts.forEach((coHostId) =>
        uniqueParticipants.add(coHostId.toString()),
      );
      event.guests.forEach((guestId) =>
        uniqueParticipants.add(guestId.toString()),
      );
      uniqueParticipants.add(event.user.toString());

      console.log(
        `Sending event reminder to ${uniqueParticipants.size} participants for event: ${event.title}`,
      );

      // Envoi des emails
      for (const userId of uniqueParticipants) {
        const recipient = await Models.userModel.findOne({ _id: userId });
        if (recipient) {
          console.log(`Ready to send email to: ${recipient.email}`);
          await sendEventReminderEmail(recipient, event);
        }
      }
    }

    // Déconnexion de MongoDB
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  } catch (error) {
    console.error("Error in event reminder job:", error);
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB due to error.");
  }
})();
