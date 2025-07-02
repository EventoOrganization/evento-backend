import { Router } from "express";
import { createEvent } from "../controller/event/createEvent";
import * as eventController from "../controller/eventController";
import { authenticateJWT } from "../middleware/authentication";

const router = Router();

// ✅ Route utilisée par ton frontend
router.post("/create", authenticateJWT, eventController.createEvent);

// ✅ Autre (ancienne ?) route avec suffixe
// router.post("/createEvent", authenticateJWT, eventController.createEvent);
router.post("/createEvent", authenticateJWT, createEvent);

// 📦 Récupération d’un event
router.get("/getEvent/:id", eventController.getEventById);
router.get("/getRSVPAndReasons/:eventId", eventController.getRSVPAndReasons);
router.get("/getUpcomingEvents", eventController.getUpcomingEvents);
router.get("/getEvents", eventController.getEvents);

// ✏️ Update
router.put(
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

// 🔁 Toggle
router.patch(
  "/toggle-upload-media",
  authenticateJWT,
  eventController.toggleUploadMedia,
);

// 📣 Announcements
router.post(
  "/:eventId/createAnnouncement",
  authenticateJWT,
  eventController.createAnnouncement,
);
router.post(
  "/announcements/:announcementId/respond",
  authenticateJWT,
  eventController.submitResponse,
);
router.delete(
  "/announcements/:announcementId",
  authenticateJWT,
  eventController.deleteAnnouncement,
);

// 👥 Guests
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
router.post(
  "/removeUserFromGoing",
  authenticateJWT,
  eventController.removeUserFromGoing,
);

// 🟢 Status
router.post(
  "/updateEventStatus",
  authenticateJWT,
  eventController.updateEventStatus,
);

// 🗑️ Delete
router.delete("/deleteEvent/:id", authenticateJWT, eventController.deleteEvent);

// 💬 Comments
router.post(
  "/:eventId/comments",
  authenticateJWT,
  eventController.createComment,
);
router.delete(
  "/:eventId/comments/:commentId",
  authenticateJWT,
  eventController.deleteComment,
);

export default router;
