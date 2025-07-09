"use strict";
module.exports = {
    async up(db, client) {
        console.log("🚀 Démarrage de la migration : ajout du champ limitedGuests");
        const result = await db.collection("events").updateMany({ limitedGuests: { $exists: false } }, // Cible les documents sans ce champ
        { $set: { limitedGuests: null } });
        console.log(`✅ Migration terminée : ${result.modifiedCount} documents mis à jour.`);
    },
    async down(db, client) {
        console.log("⏪ Rollback de la migration : suppression du champ limitedGuests");
        const result = await db.collection("events").updateMany({ limitedGuests: { $exists: true } }, // Cible les documents qui ont ce champ
        { $unset: { limitedGuests: "" } });
        console.log(`🔄 Rollback terminé : ${result.modifiedCount} documents modifiés.`);
    },
};
