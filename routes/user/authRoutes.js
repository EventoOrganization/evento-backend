// routes\user\authRoutes.js
var express = require("express");
var router = express.Router();
var authController = require("../../controller/user/authController");

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

module.exports = router;
