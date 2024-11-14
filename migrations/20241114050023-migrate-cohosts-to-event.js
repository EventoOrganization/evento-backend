const mongoose = require("mongoose");
const Event = require("../models/eventModel");
const Cohost = require("../models/cohostModel");

module.exports = {
  async up(db, client) {
    // Connexion avec mongoose
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const cohosts = await Cohost.find();

    for (const cohost of cohosts) {
      const { user_id, event_id, status } = cohost;

      // Trouver l'événement correspondant
      const event = await Event.findById(event_id);
      if (event) {
        // Vérifier si le co-host existe déjà
        const coHostExists = event.coHosts.some(
          (coHost) => coHost.userId.toString() === user_id.toString(),
        );

        if (!coHostExists) {
          event.coHosts.push({ userId: user_id, status });
          await event.save();
          console.log(`Migrated co-host ${user_id} to event ${event_id}`);
        }
      }
    }

    console.log("Migration completed successfully.");
  },

  async down(db, client) {
    // Fonction pour annuler la migration (supprimer les co-hosts migrés)
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const cohosts = await Cohost.find();

    for (const cohost of cohosts) {
      const { user_id, event_id } = cohost;

      const event = await Event.findById(event_id);
      if (event) {
        event.coHosts = event.coHosts.filter(
          (coHost) => coHost.userId.toString() !== user_id.toString(),
        );
        await event.save();
        console.log(`Rolled back co-host ${user_id} from event ${event_id}`);
      }
    }

    console.log("Rollback completed successfully.");
  },
};
