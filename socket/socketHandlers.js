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

      if (!message || !senderId || !conversationId || !messageType) {
        socket.emit(
          "error",
          "Missing required fields (message, senderId, conversationId).",
        );
        return;
      }

      try {
        // Récupérer la conversation
        const conversation = await Models.chatconstant
          .findById(conversationId)
          .populate("reciverId", "pwaSubscriptions")
          .populate("senderId", "pwaSubscriptions");

        if (!conversation) {
          socket.emit("error", "Conversation not found.");
          return;
        }

        // Créer un nouveau message
        const newMessage = new Models.message({
          senderId,
          reciverId: conversation.reciverId?._id || null,
          constantId: conversationId,
          message,
          message_type: messageType,
        });

        await newMessage.save();

        const populatedMessage = await Models.message
          .findById(newMessage._id)
          .populate("senderId", "username profileImage");

        // Envoyer le message à la room de la conversation
        io.to(conversationId).emit("send_message_emit", populatedMessage);

        // Récupérer les souscriptions des utilisateurs concernés
        let usersToNotify = [];

        // Si c'est une conversation privée, ajouter le destinataire
        if (conversation.reciverId) {
          usersToNotify.push(conversation.reciverId);
        }

        // Si c'est un groupe, récupérer les utilisateurs du groupe
        if (conversation.groupId) {
          const groupChat = await Models.groupChat
            .findById(conversation.groupId)
            .populate("users", "pwaSubscriptions");
          usersToNotify = groupChat.users;
        }

        // Ajouter l'expéditeur (optionnel si vous souhaitez qu'il reçoive aussi les notifications)
        const sender = await Models.userModel.findById(senderId);
        if (sender) usersToNotify.push(sender);

        // Envoi des notifications
        usersToNotify.forEach((user) => {
          user.pwaSubscriptions?.forEach((subscription) => {
            const payload = JSON.stringify({
              title: `Message from ${populatedMessage.senderId.username}`,
              body: message,
            });

            webPush
              .sendNotification(subscription, payload)
              .then((response) => {
                console.log("Notification sent successfully:", response);
              })
              .catch((error) => {
                console.error("Error sending notification:", error);
              });
          });
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
