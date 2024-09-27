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
module.exports = router;
