"use strict";
module.exports = {
    async up(db) {
        await db.collection("events").updateMany({}, { $set: { hiddenByUsers: [] } });
    },
    async down(db) {
        await db.collection("events").updateMany({}, { $unset: { hiddenByUsers: "" } });
    },
};
