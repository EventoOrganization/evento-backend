// routes\user\authRoutes.js
var express = require("express");
var router = express.Router();
var authController = require("../controller/authController");
const authenticateJWT = require("../middleware/authentication").authenticateJWT;

// all routes start with /auth
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authenticateJWT, authController.logout);
router.post("/verify-otp", authController.verifyEmailOTP);

module.exports = router;