const express = require("express");
const router = express.Router();

const cmsController=require('../controller/cmsController')

router.get('/page/:role',cmsController.aboutUs)
router.post('/update',cmsController.update)

module.exports = router;