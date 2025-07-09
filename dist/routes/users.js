"use strict";
var express = require("express");
var router = express.Router();
var userController = require("../controller/userController");
const authenticateJWT = require("../middleware/authentication").authenticateJWT;
const authenticateHeader = require("../middleware/authentication").authenticateHeader;
router.post("/signup", userController.signup);
router.post("/login", userController.login);
router.post("/logout", authenticateJWT, userController.logOut);
router.post("/deleteAccount", authenticateJWT, userController.deleteAccount);
router.post("/changePassword", authenticateJWT, userController.changePassword);
//Not use in Mobile
router.post("/forgotPassword", userController.forgotPassword);
router.post("/updateForgotPassword", userController.updateForgetPassword);
router.get("/resetPassword/:id/:ran_token", userController.resetPassword);
router.get("/success", userController.successMsg);
router.get("/linkExpired", userController.linkExpired);
//Upto this
router.post("/socialLogin", userController.socialLogin);
router.post("/contactUs", userController.contactUs);
router.post("/forgotPasswordOTP", userController.forgotPasswordOTP);
router.post("/otpVerify", userController.otpVerify);
router.post("/resendOtp", userController.resendOtp);
router.put("/updateProfile", authenticateJWT, userController.updateProfile);
router.get("/getProfile", authenticateJWT, userController.getProfile);
router.get("/getProfileByUserId", authenticateJWT, userController.getProfileByUserId);
router.get("/getInterestsListing", userController.getInterestsListing);
router.get("/allUserListing", userController.allUserListing);
//------------Create Event----------------//
//This route is used to create event
router.post("/createEventAndRSVPform", authenticateJWT, userController.createEventAndRSVPform);
//This route is used to fetch all upcoming events
router.get("/getAllUpcomingPublicEvents", userController.getAllUpcomingPublicEvents);
router.put("/updateEventAll", authenticateJWT, userController.updateEventALl);
router.put("/updateEvent", authenticateJWT, userController.updateEvent);
router.get("/events/:id", userController.getEventById);
router.get("/evento/:id", userController.getEventoById);
router.post("/followStatusForAllUsersThatNotAddAsCoHost", authenticateJWT, userController.followStatusForAllUsersThatNotAddAsCoHost);
router.post("/addCoHostAndGuestInExistingEvent", authenticateJWT, userController.addCoHostAndGuestInExistingEvent);
router.post("/removeGuestFromEvent", authenticateJWT, userController.removeGuestFromEvent);
router.post("/allAndVirtualEventAndNear", authenticateJWT, userController.allAndVirtualEventAndNear);
// use this to know if you are attending
router.get("/isAttending/:eventId", authenticateJWT, userController.isAttending);
// use this to know if you are saving
router.get("/isFavourite/:eventId", authenticateJWT, userController.isFavourite);
router.get("isRefused/:eventId", authenticateJWT, userController.isRefused);
// use this to know you chatting on events
router.get("/myEventsWithChat", authenticateJWT, userController.myEventsWithChat);
router.get("/RSVPanswerLog/:eventId", authenticateJWT, userController.RSVPanswerLog); //
router.get("/allRSVPanswerLog/:eventId", authenticateJWT, userController.allRSVPanswerLog); //all answer log of spcific event with count
router.post("/RSVPFormSubmission", authenticateJWT, userController.createRSVPSubmission);
router.get("/upcomingEvents", authenticateJWT, userController.myUpcomingEvents);
router.get("/pastEvents", authenticateJWT, userController.myPastEvents);
router.delete("/deleteEvent/:id", authenticateJWT, userController.deleteEvent);
router.get("/answerByUser/:userId/:eventId", authenticateJWT, userController.rsvpSubmissionAnswerByUserId); // answer given by user by id
router.get("/getProfileUser/:id", userController.getProfileUser); //User profile with upcomming and past events;
//Upload and get vidio and image for specific event
router.post("/allowAllGuestUploadPhotoVideo", authenticateJWT, userController.allowAllGuestUploadPhotoVideo);
router.post("/uploadPhotoVideo", authenticateJWT, userController.uploadPhotoVideo);
router.post("/getUploadedPhotoVideo", authenticateJWT, userController.getEventPhotoVideoUploadByUser); //Need evnet id
router.post("/attendEventConfm", authenticateJWT, userController.attendEventByTickInFigma);
router.post("/eventFavourite", authenticateJWT, userController.eventFavourite);
//-----------Privacy policy--Term and conditions-- About Us----
router.post("/createPrivacyPolicy", userController.CreatePrivacyPolicy);
router.post("/CreateTermAndCondition", userController.CreateTermAndCondition);
router.post("/CreateAboutUs", userController.CreateAboutUs);
router.get("/getPrivacyPolicy", userController.getPrivacyPolicy);
router.get("/getTermAndCondition", userController.getTermAndCondition);
router.get("/getAboutUs", userController.getAboutUs);
router.get("/getcms/:type", userController.getCMS);
// ---------------FAQ--------------------
router.post("/addFAQ", userController.addFAQ);
router.get("/getFAQ", userController.getFAQ);
//---------------Follow user--------------
router.post("/follow", authenticateJWT, userController.userFollow);
router.get("/userListWithFollowingStatus", userController.followStatusForAllUsers);
router.post("/followStatusForAttendedUsers", userController.followStatusForAttendedUsers);
// users that following the logged user
router.get("/followStatusForAllUsersWithUserId/:id", authenticateJWT, userController.followStatusForAllUsersWithUserId);
router.get("/followStatusForUsersYouFollow/:id", authenticateJWT, userController.followStatusForUsersYouFollow);
router.get("/followStatusForAllUsersWithUserIdSartaj/:id", authenticateJWT, userController.followStatusForAllUsersWithUserIdSartaj);
router.get("/userListWithFollowingStatusWithPagination", userController.userListWithFollowingStatusWithPagination);
router.get("/getUsers", userController.getUsers);
//--------------Socket Router------------------- not add in postman
router.post("/saveMessage", userController.saveMessage);
router.post("/reportUser", userController.reportUser);
router.post("/blockUser", userController.blockUser);
// router.post("/clearChat",userController.clearChat);
//---------------Search anything regarding data inside application-----------------
router.get("/wholeApplicationSearch", authenticateJWT, userController.onWholeApplicationSearch);
//Notification
router.get("/followingNotification", authenticateJWT, userController.FollowReciverNotification);
router.get("/eventNotification", authenticateJWT, userController.eventNotificationList);
router.get("/notificationList", authenticateJWT, userController.notificationList);
router.post("/followingNotificationRead", authenticateJWT, userController.FollowerReciverNotificatonRead);
router.post("/eventNotificatonRead", authenticateJWT, userController.eventNotificatonRead);
router.post("/clearNotification", authenticateJWT, userController.clearNotification);
router.get("/deleteBulk", userController.deleteData);
router.get("/test", userController.test);
module.exports = router;
