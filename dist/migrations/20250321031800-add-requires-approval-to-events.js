"use strict";
module.exports = {
    async up(db) {
        await db.collection("events").updateMany({ requiresApproval: { $exists: false } }, {
            $set: {
                requiresApproval: false,
                approvedUserIds: [],
            },
        });
    },
    async down(db) {
        await db.collection("events").updateMany({}, {
            $unset: {
                requiresApproval: "",
                approvedUserIds: "",
            },
        });
    },
};
