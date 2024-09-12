var express = require("express");
var router = express.Router();
var eventController = require("../controller/eventController");
const authenticateJWT = require("../middleware/authentication").authenticateJWT;

// Create events
router.post("/createEvent", authenticateJWT, eventController.createEvent);

// Get events
router.get("/getEvent/:id", eventController.getEventById);
router.get("/getUpcomingEvents", eventController.getUpcomingEvents);

// Update events
router.put("/updateEvent/:id", authenticateJWT, eventController.updateEvent);

// Add Guests
router.post("/addGuests/:id", authenticateJWT, eventController.addGuests);

// Handling Status
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

// Delete events
router.delete("/deleteEvent/:id", authenticateJWT, eventController.deleteEvent);

module.exports = router;
