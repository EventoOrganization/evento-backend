var express = require("express");
var router = express.Router();
var sesController = require("../controller/sesController");

router.post("/bounced", sesController.bounced);
module.exports = router;
