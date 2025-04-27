var express = require("express");
var router = express.Router();
var chatController = require("../controller/chatController");
const authenticateJWT = require("../middleware/authentication").authenticateJWT;

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
  "/conversations/:conversationId/leave",
  authenticateJWT,
  chatController.leaveConversation,
);
// Delete a conversation
router.delete(
  "/conversations/:conversationId",
  authenticateJWT,
  chatController.deleteConversations,
);
// =============================================================================
// MESSAGES
// =============================================================================
router.post("/messages", authenticateJWT, chatController.createMessages);
module.exports = router;
