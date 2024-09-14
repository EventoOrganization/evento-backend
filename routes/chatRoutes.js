var express = require("express");
var router = express.Router();
var chatController = require("../controller/chatController");
const authenticateJWT = require("../middleware/authentication").authenticateJWT;

router.get(
  "/myEventsWithChat",
  authenticateJWT,
  chatController.myEventsWithChat,
);
module.exports = router;
