// Migration script to add the `preferences` field to all `TempGuest` documents

module.exports = {
  async up(db) {
    // Define the default preferences
    const defaultPreferences = {
      receiveEventUpdates: true,
      receiveReminders: true,
      receiveInvites: true,
    };

    // Update all TempGuest documents to include the default preferences
    await db
      .collection("tempgests")
      .updateMany({}, { $set: { preferences: defaultPreferences } });

    console.log(
      "Migration completed: Preferences added to all TempGuest documents.",
    );
  },

  async down(db) {
    // Remove the preferences field during rollback
    await db
      .collection("tempgests")
      .updateMany({}, { $unset: { preferences: "" } });

    console.log(
      "Rollback completed: Preferences removed from all TempGuest documents.",
    );
  },
};
