// handlers/joinConversations.js
module.exports = ({ socket }) => {
  socket.on("join_conversations", ({ conversationIds }) => {
    conversationIds.forEach((id) => {
      socket.join(id);
      console.log(`→ ${socket.id} joined room ${id}`);
    });
  });
};
