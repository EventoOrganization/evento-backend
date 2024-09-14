var express = require("express");
var router = express.Router();
var chatController = require("../controller/chatController");
const authenticateJWT = require("../middleware/authentication").authenticateJWT;

router.get(
  "/myEventsWithChat",
  authenticateJWT,
  chatController.myEventsWithChat,
);
router.get(
  "/privateConversations",
  authenticateJWT,
  chatController.privateConversations,
);
router.post("/saveMessage", chatController.saveMessage);
module.exports = router;
