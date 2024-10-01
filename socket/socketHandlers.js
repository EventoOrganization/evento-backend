const Models = require("../models");
module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("New client connected", socket.id);
    socket.on("join_conversations", ({ conversationIds }) => {
      conversationIds.forEach((conversationId) => {
        socket.join(conversationId);
        console.log(`User ${socket.id} joined conversation: ${conversationId}`);
      });
    });
    socket.on("send_message", async (data) => {
      const { message, senderId, conversationId, messageType } = data;

      // Validate required fields
      if (!message || !senderId || !conversationId || !messageType) {
        socket.emit(
          "error",
          "Missing required fields (message, senderId, conversationId).",
        );
        return;
      }

      try {
        // Look up the conversation in the database
        const conversation = await Models.chatconstant.findById(conversationId);
        if (!conversation) {
          socket.emit("error", "Conversation not found.");
          return;
        }

        const newMessage = new Models.message({
          senderId,
          reciverId: conversation.targetId,
          constantId: conversationId,
          message,
          message_type: messageType,
        });

        await newMessage.save();

        const populatedMessage = await Models.message
          .findById(newMessage._id)
          .populate("senderId", "username profileImage");

        // Emit the message to the conversation room
        io.to(conversationId).emit("send_message_emit", populatedMessage);

        // Log which socket emitted the message
        console.log(
          `Message emitted from socket ${socket.id} to conversationId: ${conversationId}`,
        );
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", "Failed to send message.");
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};
