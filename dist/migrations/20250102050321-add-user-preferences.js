"use strict";
// migrations/<timestamp>-add-user-preferences.js
module.exports = {
    async up(db) {
        // Ajouter le champ "preferences" avec les valeurs par défaut pour tous les utilisateurs existants
        await db.collection("users").updateMany({}, // Appliquer à tous les documents
        {
            $set: {
                preferences: {
                    receiveEventUpdates: true,
                    receiveReminders: true,
                    receiveInvites: true,
                },
            },
        });
        console.log("Migration: Added preferences field with default values.");
    },
    async down(db) {
        // Supprimer le champ "preferences" si la migration est annulée
        await db.collection("users").updateMany({}, // Appliquer à tous les documents
        { $unset: { preferences: "" } });
        console.log("Rollback: Removed preferences field.");
    },
};
