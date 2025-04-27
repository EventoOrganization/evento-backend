var express = require("express");
var router = express.Router();
var chatController = require("../controller/chatController");
const authenticateJWT = require("../middleware/authentication").authenticateJWT;

router.delete(
  "/deleteConversation/:conversationId",
  authenticateJWT,
  chatController.deleteConversation,
);
router.delete(
  "/deleteMessage/:messageId",
  authenticateJWT,
  chatController.deleteMessage,
);
router.post(
  "/startPrivateConversation",
  authenticateJWT,
  chatController.startPrivateConversation,
);
router.get(
  "/fetchConversations",
  authenticateJWT,
  chatController.fetchConversations,
);
router.get(
  "/fetchMessages/:chatId",
  authenticateJWT,
  chatController.fetchMessages,
);
router.post("/sendMessage", chatController.sendMessage);
// new socketio routes 27/04/2025
// =============================================================================
// CONVERSATIONS
// =============================================================================
// Create a new conversation
router.post(
  "/conversations",
  authenticateJWT,
  chatController.createConversations,
);
// Get all conversations
router.get(
  "/conversations",
  authenticateJWT,
  chatController.fetchConversations,
);
// Update a conversation
router.patch(
  "/conversations/:conversationId",
  authenticateJWT,
  chatController.updateConversations,
);
// Delete a conversation
router.delete(
  "/conversations/:conversationId",
  authenticateJWT,
  chatController.deleteConversations,
);
module.exports = router;
