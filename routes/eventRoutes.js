var express = require("express");
var router = express.Router();
var eventController = require("../controller/eventController");
const authenticateJWT = require("../middleware/authentication").authenticateJWT;

// Create events
router.post("/createEvent", authenticateJWT, eventController.createEvent);

// Get events
router.get("/getEvent/:id", eventController.getEventById);
router.get("/getRSVPAndReasons/:eventId", eventController.getRSVPAndReasons);
router.get("/getUpcomingEvents", eventController.getUpcomingEvents);

// Update events
router.patch(
  "/updateEvent/:eventId",
  authenticateJWT,
  eventController.updateEventField,
);
router.post(
  "/storePostEventMedia",
  authenticateJWT,
  eventController.storePostEventMedia,
);
router.delete(
  "/deletePostEventMedia/:eventId",
  authenticateJWT,
  eventController.deletePostEventMedia,
);
// toggle allowed postEventMedia
router.patch(
  "/toggle-upload-media",
  authenticateJWT,
  eventController.toggleUploadMedia,
);

// handle Guests
router.post(
  "/:eventId/requestToJoin",
  authenticateJWT,
  eventController.requestToJoin,
);
router.post(
  "/:eventId/acceptRequest",
  authenticateJWT,
  eventController.acceptRequest,
);
router.patch("/addGuests/:id", authenticateJWT, eventController.addGuests);
router.post("/unGuestUser", authenticateJWT, eventController.unGuestUser);
router.put(
  "/:id/updateGuestsAllowFriend",
  authenticateJWT,
  eventController.updateGuestsAllowFriend,
);
// Handling Status
router.post(
  "/updateEventStatus",
  authenticateJWT,
  eventController.updateEventStatus,
);
// router.post(
//   "/attendEventStatus",
//   authenticateJWT,
//   eventController.attendEventStatus,
// );
// router.post(
//   "/favouriteEventStatus",
//   authenticateJWT,
//   eventController.favouriteEventStatus,
// );
// router.post(
//   "/refusedEventStatus",
//   authenticateJWT,
//   eventController.refusedEventStatus,
// );

// Delete events
router.delete("/deleteEvent/:id", authenticateJWT, eventController.deleteEvent);

module.exports = router;
