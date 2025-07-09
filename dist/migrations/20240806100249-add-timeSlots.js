"use strict";
module.exports = {
    async up(db, client) {
        // Add the timeSlots field to the events collection
        await db.collection("events").updateMany({}, {
            $set: { "details.timeSlots": [] },
        });
        // Additional code to update the schema if required
    },
    async down(db, client) {
        // Remove the timeSlots field from the events collection
        await db.collection("events").updateMany({}, {
            $unset: { "details.timeSlots": "" },
        });
        // Additional code to revert schema changes if required
    },
};
