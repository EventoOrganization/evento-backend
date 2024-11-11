// migrations/20241110120000-add-timezone-to-events.js

const { ObjectId } = require("mongodb");

module.exports = {
  async up(db) {
    console.log("Adding default timeZone to existing events...");

    // Mettre à jour tous les événements pour ajouter la propriété `timeZone`
    const defaultTimeZone = "UTC"; // Remplacez par la timezone par défaut que vous souhaitez utiliser
    await db
      .collection("events")
      .updateMany(
        { "details.timeZone": { $exists: false } },
        { $set: { "details.timeZone": defaultTimeZone } },
      );

    console.log("Migration completed: Added default timeZone to events.");
  },

  async down(db) {
    console.log("Reverting migration: Removing timeZone from events...");

    // Supprimer la propriété `timeZone` ajoutée
    await db
      .collection("events")
      .updateMany(
        { "details.timeZone": { $exists: true } },
        { $unset: { "details.timeZone": "" } },
      );

    console.log("Reverted migration: Removed timeZone from events.");
  },
};
