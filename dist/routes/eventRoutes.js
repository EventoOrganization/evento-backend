"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const createEvent_1 = require("../controller/event/createEvent");
const eventController = __importStar(require("../controller/eventController"));
const authentication_1 = require("../middleware/authentication");
const router = (0, express_1.Router)();
// ✅ Route utilisée par ton frontend
router.post("/create", authentication_1.authenticateJWT, eventController.createEvent);
// ✅ Autre (ancienne ?) route avec suffixe
// router.post("/createEvent", authenticateJWT, eventController.createEvent);
router.post("/createEvent", authentication_1.authenticateJWT, createEvent_1.createEvent);
// 📦 Récupération d’un event
router.get("/getEvent/:id", eventController.getEventById);
router.get("/getRSVPAndReasons/:eventId", eventController.getRSVPAndReasons);
router.get("/getUpcomingEvents", eventController.getUpcomingEvents);
router.get("/getEvents", eventController.getEvents);
// ✏️ Update
router.put("/updateEvent/:eventId", authentication_1.authenticateJWT, eventController.updateEventField);
router.post("/storePostEventMedia", authentication_1.authenticateJWT, eventController.storePostEventMedia);
router.delete("/deletePostEventMedia/:eventId", authentication_1.authenticateJWT, eventController.deletePostEventMedia);
// 🔁 Toggle
router.patch("/toggle-upload-media", authentication_1.authenticateJWT, eventController.toggleUploadMedia);
// 📣 Announcements
router.post("/:eventId/createAnnouncement", authentication_1.authenticateJWT, eventController.createAnnouncement);
router.post("/announcements/:announcementId/respond", authentication_1.authenticateJWT, eventController.submitResponse);
router.delete("/announcements/:announcementId", authentication_1.authenticateJWT, eventController.deleteAnnouncement);
// 👥 Guests
router.post("/:eventId/requestToJoin", authentication_1.authenticateJWT, eventController.requestToJoin);
router.post("/:eventId/acceptRequest", authentication_1.authenticateJWT, eventController.acceptRequest);
router.patch("/addGuests/:id", authentication_1.authenticateJWT, eventController.addGuests);
router.post("/unGuestUser", authentication_1.authenticateJWT, eventController.unGuestUser);
router.put("/:id/updateGuestsAllowFriend", authentication_1.authenticateJWT, eventController.updateGuestsAllowFriend);
router.post("/removeUserFromGoing", authentication_1.authenticateJWT, eventController.removeUserFromGoing);
// 🟢 Status
router.post("/updateEventStatus", authentication_1.authenticateJWT, eventController.updateEventStatus);
// 🗑️ Delete
router.delete("/deleteEvent/:id", authentication_1.authenticateJWT, eventController.deleteEvent);
// 💬 Comments
router.post("/:eventId/comments", authentication_1.authenticateJWT, eventController.createComment);
router.delete("/:eventId/comments/:commentId", authentication_1.authenticateJWT, eventController.deleteComment);
exports.default = router;
