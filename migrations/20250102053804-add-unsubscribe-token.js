const crypto = require("crypto");

module.exports = {
  async up(db) {
    // Ajouter unsubscribeToken pour tous les utilisateurs existants
    await db.collection("users").updateMany(
      { unsubscribeToken: { $exists: false } },
      {
        $set: {
          unsubscribeToken: crypto.randomBytes(32).toString("hex"),
        },
      },
    );

    // Ajouter unsubscribeToken pour tous les invités temporaires existants
    await db.collection("tempguests").updateMany(
      { unsubscribeToken: { $exists: false } },
      {
        $set: {
          unsubscribeToken: crypto.randomBytes(32).toString("hex"),
        },
      },
    );

    console.log("Added unsubscribeToken to Users and TempGuests");
  },

  async down(db) {
    // Supprimer les champs unsubscribeToken ajoutés
    await db
      .collection("users")
      .updateMany({}, { $unset: { unsubscribeToken: "" } });

    await db
      .collection("tempguests")
      .updateMany({}, { $unset: { unsubscribeToken: "" } });

    console.log("Removed unsubscribeToken from Users and TempGuests");
  },
};
