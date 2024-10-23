const Models = require("../models");
const webPush = require("web-push");
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

        // Test sending a web push notification to yourself
        const mySubscription = {
          endpoint:
            "https://fcm.googleapis.com/fcm/send/f1YRhPyD8BA:APA91bE9wyy9mtA2JmVbMcPJKpVmk3GNN1YLhdSFb6ek86JEHuBR0t3qOl65AETlOdgAN3L28wkGzTbie3AabxJUO_08SUIe0-hokEvMwBAma03-M9meJciyAGm3PAqpU7O8hUtb0l2z",
          keys: {
            p256dh:
              "BLheZrpwPa-A5iDmfN4-1lM6IQ6hqHN1WUt8BpnEq5PWduDP_qCXaYQ59QTZVtV800zib_eQ-KByv5rqlRCNL5w",
            auth: "jD9A74QFMiHZ71d8fyNurA",
          },
        };

        const payload = JSON.stringify({
          title: `Message from ${populatedMessage.senderId.username}`,
          body: `${message}`,
        });

        webPush
          .sendNotification(mySubscription, payload)
          .then((response) => {
            console.log("Notification sent successfully:", response);
          })
          .catch((error) => {
            console.error("Error sending notification:", error);
          });
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
