"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const createMessage_1 = require("../controller/chat/createMessage");
const chatController_1 = __importDefault(require("../controller/chatController"));
const authentication_1 = require("../middleware/authentication");
const router = express_1.default.Router();
// new socketio routes 27/04/2025
// =============================================================================
// CONVERSATIONS
// =============================================================================
// Create a new conversation
router.post("/conversations", authentication_1.authenticateJWT, chatController_1.default.createConversations);
// Get all conversations
router.get("/conversations", authentication_1.authenticateJWT, chatController_1.default.fetchConversations);
// Update a conversation
router.patch("/conversations/:conversationId/join", authentication_1.authenticateJWT, chatController_1.default.joinConversation);
router.patch("/conversations/:conversationId/leave", authentication_1.authenticateJWT, chatController_1.default.leaveConversation);
// Delete a conversation
router.delete("/conversations/:conversationId", authentication_1.authenticateJWT, chatController_1.default.deleteConversations);
// =============================================================================
// MESSAGES
// =============================================================================
// router.post("/messages", authenticateJWT, chatController.createMessages);
router.post("/messages", authentication_1.authenticateJWT, createMessage_1.createMessage);
router.get("/messages", authentication_1.authenticateJWT, chatController_1.default.fetchOlderMessages);
exports.default = router;
