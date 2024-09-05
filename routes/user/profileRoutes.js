var express = require("express");
var router = express.Router();
var profileController = require("../../controller/user/profileController");

router.get("/getProfile", profileController.getProfile);
router.put("/updateProfile", profileController.updateProfile);

module.exports = router;
