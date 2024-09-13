const { ObjectId } = require("mongodb");

module.exports = {
  async up(db, client) {
    // Récupérer tous les événements qui ont des coHosts
    const events = await db
      .collection("events")
      .find({ coHosts: { $exists: true, $ne: [] } })
      .toArray();

    for (const event of events) {
      for (const coHost of event.coHosts) {
        // Insérer chaque coHost dans la collection cohosts
        await db.collection("cohosts").insertOne({
          user_id: new ObjectId(coHost.user), // ID de l'utilisateur du coHost
          event_id: new ObjectId(event._id), // ID de l'événement
          status: coHost.status || "read-only", // Statut du coHost
          createdAt: new Date(), // Date de création
          updatedAt: new Date(), // Date de mise à jour
        });
      }

      // Supprimer les coHosts de la collection events (si nécessaire)
      await db.collection("events").updateOne(
        { _id: new ObjectId(event._id) },
        { $unset: { coHosts: "" } }, // Supprime le champ coHosts
      );
    }
  },

  async down(db, client) {
    // Récupérer tous les enregistrements de la collection cohosts
    const cohosts = await db.collection("cohosts").find().toArray();

    for (const cohost of cohosts) {
      // Récupérer l'événement associé à chaque cohost
      const event = await db
        .collection("events")
        .findOne({ _id: new ObjectId(cohost.event_id) });

      if (event) {
        // Réinsérer le coHost dans l'événement
        await db
          .collection("events")
          .updateOne(
            { _id: new ObjectId(cohost.event_id) },
            {
              $push: {
                coHosts: {
                  user: new ObjectId(cohost.user_id),
                  status: cohost.status,
                },
              },
            },
          );
      }

      // Supprimer le coHost de la collection cohosts
      await db
        .collection("cohosts")
        .deleteOne({ _id: new ObjectId(cohost._id) });
    }
  },
};
