module.exports = {
  async up(db) {
    console.log(
      "Adding fields visibility, restricted, and showUsersLists with default values...",
    );

    // Mettre à jour tous les documents pour inclure les champs avec les valeurs par défaut
    const result = await db.collection("events").updateMany(
      {}, // Pas de filtre : applique à tous les documents
      {
        $set: {
          visibility: true,
          restricted: false,
          showUsersLists: true,
        },
      },
    );

    console.log(
      `Migration complete. Updated ${result.modifiedCount} documents.`,
    );
  },

  async down(db) {
    console.log(
      "Removing fields visibility, restricted, and showUsersLists...",
    );

    // Supprime les champs ajoutés
    const result = await db.collection("events").updateMany(
      {}, // Pas de filtre : applique à tous les documents
      {
        $unset: {
          visibility: "", // Supprime le champ
          restricted: "",
          showUsersLists: "",
        },
      },
    );

    console.log(
      `Rollback complete. Updated ${result.modifiedCount} documents.`,
    );
  },
};
