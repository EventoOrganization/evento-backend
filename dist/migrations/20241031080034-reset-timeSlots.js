"use strict";
// migrations/20231030123456-reset-timeSlots.js
module.exports = {
    async up(db) {
        await db.collection("events").updateMany({}, [
            {
                $set: {
                    "details.timeSlots": {
                        $cond: {
                            if: { $gt: ["$details.date", null] },
                            then: [
                                {
                                    date: {
                                        $dateToString: {
                                            format: "%Y-%m-%d",
                                            date: "$details.date",
                                        },
                                    },
                                    startTime: { $ifNull: ["$details.startTime", "08:00"] },
                                    endTime: { $ifNull: ["$details.endTime", "18:00"] },
                                },
                            ],
                            else: [],
                        },
                    },
                },
            },
        ]);
    },
    async down(db) {
        // Optionnel : reset `timeSlots` à son état précédent
        await db
            .collection("events")
            .updateMany({}, { $unset: { "details.timeSlots": "" } });
    },
};
