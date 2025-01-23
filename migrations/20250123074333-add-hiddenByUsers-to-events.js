module.exports = {
  async up(db) {
    await db.collection("events").updateMany(
      {},
      { $set: { hiddenByUsers: [] } }, // Ajoute `hiddenByUsers` avec une valeur par défaut
    );
  },

  async down(db) {
    await db.collection("events").updateMany(
      {},
      { $unset: { hiddenByUsers: "" } }, // Supprime le champ en cas de rollback
    );
  },
};
