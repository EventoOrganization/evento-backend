// handlers/sendMessage.js
const Models = require("../models");

module.exports = ({ io, socket }) => {
  socket.on("send_message", async (data) => {
    const { message, senderId, conversationId, messageType } = data;
    // ... tes validations et ta logique DB
    // Puis :
    const populatedMessage =
      /* résultat de ta population */
      io.to(conversationId).emit("send_message_emit", populatedMessage);
  });
};
