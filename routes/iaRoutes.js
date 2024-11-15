var express = require("express");
var router = express.Router();
var iaController = require("../controller/iaController");
const authenticateJWT = require("../middleware/authentication").authenticateJWT;

router.get("/feedbacks", authenticateJWT, iaController.feedbacks);
router.post("/feedbacks/submit", authenticateJWT, iaController.submitFeedbacks);
router.get("/feedbacks/id", authenticateJWT, iaController.feedback);

module.exports = router;
