var express = require("express");
var router = express.Router();
var eventController = require("../controller/eventController");
const authenticateJWT = require("../middleware/authentication").authenticateJWT;

// All routes start with /event
router.post("/createEvent", authenticateJWT, eventController.createEvent);
router.get("/getEvent/:id", eventController.getEventById);
router.get("/getUpcomingEvents", eventController.getUpcomingEvents);

module.exports = router;
