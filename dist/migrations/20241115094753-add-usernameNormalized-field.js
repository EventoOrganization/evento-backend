"use strict";
const mongoose = require("mongoose");
module.exports = {
    async up(db, client) {
        console.log("Starting migration: Normalizing all 'usernameNormalized' fields...");
        // Accéder à la collection `users`
        const usersCollection = db.collection("users");
        // Récupérer tous les utilisateurs existants
        const users = await usersCollection.find({}).toArray();
        // Mettre à jour chaque utilisateur avec le champ `usernameNormalized`
        for (const user of users) {
            // Normaliser le nom d'utilisateur ou utiliser "anonymous" par défaut
            const normalizedUsername = (user.username || "anonymous")
                .toLowerCase()
                .trim()
                .replace(/\s+/g, "")
                .replace(/\./g, "");
            // Mettre à jour le champ `usernameNormalized`
            await usersCollection.updateOne({ _id: user._id }, {
                $set: {
                    usernameNormalized: normalizedUsername,
                },
            });
            console.log(`Updated user: ${user.username} -> ${normalizedUsername}`);
        }
        console.log("Migration completed successfully.");
    },
    async down(db, client) {
        console.log("Reverting migration: Removing 'usernameNormalized' field...");
        // Supprimer le champ `usernameNormalized` pour tous les documents
        await db
            .collection("users")
            .updateMany({}, { $unset: { usernameNormalized: "" } });
        console.log("Reversion completed successfully.");
    },
};
