const mongoose = require("mongoose");

module.exports = {
  async up(db) {
    console.log("Adding URLtitle to existing events...");

    // Ajouter le champ URLtitle à tous les documents existants
    await db.collection("events").updateMany(
      { "details.URLtitle": { $exists: false } },
      {
        $set: { "details.URLtitle": "" },
      },
    );

    console.log("URLtitle field added successfully.");
  },

  async down(db) {
    console.log("Removing URLtitle field from existing events...");

    // Supprimer le champ URLtitle si la migration est annulée
    await db.collection("events").updateMany(
      {},
      {
        $unset: { "details.URLtitle": "" },
      },
    );

    console.log("URLtitle field removed successfully.");
  },
};
