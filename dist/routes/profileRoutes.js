"use strict";
var express = require("express");
var router = express.Router();
var profileController = require("../controller/profileController");
const authenticateJWT = require("../middleware/authentication").authenticateJWT;
// All routes start with /profile
router.get("/getLoggedUserProfile", authenticateJWT, profileController.getLoggedUserProfile);
router.put("/updateProfile", authenticateJWT, profileController.updateProfile);
router.get("/userProfile/:userId", profileController.getUserProfileById);
router.get("/getPreferences", profileController.getPreferences);
router.put("/updatePreferences", profileController.updatePreferences);
module.exports = router;
