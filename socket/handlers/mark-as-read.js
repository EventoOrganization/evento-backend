const Models = require("../../models");
module.exports = ({ socket }) => {
  socket.on("mark-as-read", async ({ conversationId, lastSeenMessageId }) => {
    const userId = socket.userId;

    console.log("[socket.on mark-as-read] 🛬 Received from client:", {
      userId,
      conversationId,
      lastSeenMessageId,
    });

    await Models.conversationModel.updateOne(
      { _id: conversationId },
      { $set: { [`readReceipts.${userId}`]: lastSeenMessageId } },
    );

    console.log(
      "[socket.on mark-as-read] 🛠 Updated conversation readReceipts!",
    );

    socket.to(conversationId).emit("read-receipt", {
      conversationId,
      userId,
      lastSeenMessageId,
    });

    console.log(
      "[socket.on mark-as-read] 🚀 Emitted read-receipt to other clients.",
    );
  });
};
