var express = require("express");
var router = express.Router();
var dashBoardController = require("../controller/dashboardController");

router.get("/dashboard", dashBoardController.dashboard);
router.get("/login", dashBoardController.login);
router.post("/login", dashBoardController.loginAdmin);
// router.get('/profile',dashBoardController.profile)
router.get("/view/:id", dashBoardController.view);
router.get("/viewInterest/:id", dashBoardController.viewInterest);
// router.post('/addInterest',dashBoardController.adddInterest)
router.post("/addInterest", dashBoardController.addNewInterest);
router.get("/addInterest", dashBoardController.addInterest);
router.get("/editInterest/:id", dashBoardController.editInterest);
router.get("/viewEvent/:id", dashBoardController.viewEvent);
router.post("/deleteuser", dashBoardController.deleteuser);
router.post("/deleteInterest", dashBoardController.deleteInterest);
router.post("/deleteEvent", dashBoardController.deleteEvent);
router.get("/updateProfile", dashBoardController.Profile);
router.get("/changePassword", dashBoardController.changePassword);
router.post("/editPassword", dashBoardController.editPassword);
router.get("/users", dashBoardController.users);
router.get("/interests", dashBoardController.interests);
router.get("/events", dashBoardController.events);
router.post("/UpdateProfile", dashBoardController.UpdateProfile);
router.post("/creteusers", dashBoardController.creteusers);
router.post("/logout", dashBoardController.logOut);
router.get("/Edituser/:id", dashBoardController.Edituser);
router.post("/EditInterest", dashBoardController.EditInterest);
router.post("/updateUser", dashBoardController.updateUser);
router.post("/event", dashBoardController.event);

router.post("/co_host", dashBoardController.co_host);
router.get("/co_host_list", dashBoardController.co_host_list);
router.post("/delete_cohost", dashBoardController.delete_cohost);

router.get("/contactUs", dashBoardController.contactUs);
router.post("/deleteContactUs", dashBoardController.delete_contactUs);

router.get("/report", dashBoardController.getReport);
router.post("/deleteReportedUser", dashBoardController.deleteuser);
router.post("/blockUser", dashBoardController.blockUser);
module.exports = router;
