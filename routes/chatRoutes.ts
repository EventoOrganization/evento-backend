import express, { Router } from "express";
import { createMessage } from "../controller/chat/createMessage";
import chatController from "../controller/chatController";
import { authenticateJWT } from "../middleware/authentication";

const router: Router = express.Router();

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
  "/conversations/:conversationId/join",
  authenticateJWT,
  chatController.joinConversation,
);
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
// router.post("/messages", authenticateJWT, chatController.createMessages);
router.post("/messages", authenticateJWT, createMessage);
router.get("/messages", authenticateJWT, chatController.fetchOlderMessages);

export default router;
