// routes\sitemapRoutes.js
var express = require("express");
var router = express.Router();

const { getSitemapData } = require("../controller/sitemapController");
router.get("/sitemap-data", getSitemapData);

module.exports = router;
