module.exports = {
  async up(db) {
    const result = await db
      .collection("users")
      .updateMany(
        { stripe: { $exists: false } },
        { $set: { stripe: { accountId: null } } },
      );
    console.log(`✅ Migrated ${result.modifiedCount} users`);
  },

  async down(db) {
    const result = await db
      .collection("users")
      .updateMany({}, { $unset: { stripe: "" } });
    console.log(`↩️ Rolled back ${result.modifiedCount} users`);
  },
};
