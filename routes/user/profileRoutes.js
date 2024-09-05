var express = require("express");
var router = express.Router();
var profileController = require("../../controller/user/profileController");
const authenticateJWT =
  require("../../middleware/authentication").authenticateJWT;

router.get("/getProfile", authenticateJWT, profileController.getProfile);
router.put("/updateProfile", profileController.updateProfile);

module.exports = router;
