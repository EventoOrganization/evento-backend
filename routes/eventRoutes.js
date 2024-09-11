var express = require("express");
var router = express.Router();
var eventController = require("../controller/eventController");
const authenticateJWT = require("../middleware/authentication").authenticateJWT;

router.post("/createEvent", authenticateJWT, eventController.createEvent);

// Get events
router.get("/getEvent/:id", eventController.getEventById);
router.get("/getUpcomingEvents", eventController.getUpcomingEvents);

// Delete events
router.delete("/deleteEvent/:id", authenticateJWT, eventController.deleteEvent);

// Update events
router.post(
  "/attendEventStatus",
  authenticateJWT,
  eventController.attendEventStatus,
);
router.post(
  "/favouriteEventStatus",
  authenticateJWT,
  eventController.favouriteEventStatus,
);
router.post(
  "/refusedEventStatus",
  authenticateJWT,
  eventController.refusedEventStatus,
);

module.exports = router;
