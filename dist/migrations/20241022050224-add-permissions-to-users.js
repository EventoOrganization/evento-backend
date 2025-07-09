"use strict";
module.exports = {
    async up(db, client) {
        // Ajouter le champ "permissions" aux utilisateurs existants
        await db.collection("users").updateMany({}, // Appliquer à tous les documents
        {
            $set: {
                "permissions.notifications": "default",
                "permissions.geolocation": "default",
            },
        });
    },
    async down(db, client) {
        // Suppression des champs ajoutés si on doit revenir en arrière
        await db.collection("users").updateMany({}, {
            $unset: {
                "permissions.notifications": "",
                "permissions.geolocation": "",
            },
        });
    },
};
