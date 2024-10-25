module.exports = {
  async up(db, client) {
    // Ajout des champs 'pwaNotification' et 'pwaSubscriptions' avec des valeurs par défaut
    await db.collection("users").updateMany(
      {
        $or: [
          { pwaNotification: { $exists: false } },
          { pwaSubscriptions: { $exists: false } },
        ],
      },
      {
        $set: {
          pwaNotification: false, // Valeur par défaut pour la notification
          pwaSubscriptions: [], // Valeur par défaut pour les subscriptions
        },
      },
    );
  },

  async down(db, client) {
    // Suppression des champs si vous devez revenir en arrière
    await db.collection("users").updateMany(
      {},
      {
        $unset: {
          pwaNotification: "",
          pwaSubscriptions: "",
        },
      },
    );
  },
};
