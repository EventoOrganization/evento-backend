"use strict";
module.exports = {
    async up(db, client) {
        // Ajouter un champ `subInterests` (tableau vide) aux documents existants
        await db.collection("interests").updateMany({ subInterests: { $exists: false } }, // Condition : Si `subInterests` n'existe pas encore
        { $set: { subInterests: [] } });
    },
    async down(db, client) {
        // Supprimer le champ `subInterests` (pour revenir en arrière)
        await db.collection("interests").updateMany({ subInterests: { $exists: true } }, // Condition : Si `subInterests` existe
        { $unset: { subInterests: "" } });
    },
};
