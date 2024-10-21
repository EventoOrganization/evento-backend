module.exports = {
  async up(db, client) {
    // Chercher tous les utilisateurs
    const users = await db.collection("users").find().toArray();

    for (const user of users) {
      let normalizedUsername = user.username
        ? user.username.trim().toLowerCase()
        : "anonymous";
      let usernameNormalized =
        normalizedUsername.charAt(0).toUpperCase() +
        normalizedUsername.slice(1);

      // Si le username est vide, le définir sur "anonymous"
      if (!user.username || user.username === "") {
        normalizedUsername = "anonymous";
        usernameNormalized = "Anonymous";
      }

      // Mettre à jour l'utilisateur avec les nouvelles valeurs
      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            username: normalizedUsername,
            usernameNormalized: usernameNormalized,
          },
        },
      );
    }
    console.log("Migration terminée : tous les usernames ont été normalisés.");
  },

  async down(db, client) {
    // Optionnel : Si vous souhaitez ajouter une logique de "rollback", vous pouvez rétablir les anciennes valeurs ici
    console.log("Rollback non implémenté.");
  },
};
