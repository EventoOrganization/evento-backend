var express = require("express");
var router = express.Router();
var eventController = require("../../controller/user/eventController");

router.post("/createEvent", eventController.createEvent);
router.get("/getEvent/:id", eventController.getEventById);

module.exports = router;
