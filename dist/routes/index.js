"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// Import all subroutes
const authRoutes_1 = __importDefault(require("./authRoutes"));
const chatRoutes_1 = __importDefault(require("./chatRoutes"));
const cmsRoutes_1 = __importDefault(require("./cmsRoutes"));
const dashBoardRoutes_1 = __importDefault(require("./dashBoardRoutes"));
const eventRoutes_1 = __importDefault(require("./eventRoutes"));
const iaRoutes_1 = __importDefault(require("./iaRoutes"));
const profileRoutes_1 = __importDefault(require("./profileRoutes"));
const sesRoutes_1 = __importDefault(require("./sesRoutes"));
const sitemapRoutes_1 = __importDefault(require("./sitemapRoutes"));
const users_1 = __importDefault(require("./users"));
const whatsappRoutes_1 = __importDefault(require("./whatsappRoutes"));
const router = (0, express_1.Router)();
// Mount routes
router.use("/", dashBoardRoutes_1.default);
router.use("/", cmsRoutes_1.default);
router.use("/users", users_1.default);
router.use("/auth", authRoutes_1.default);
router.use("/events", eventRoutes_1.default);
router.use("/profile", profileRoutes_1.default);
router.use("/chats", chatRoutes_1.default);
router.use("/ses", sesRoutes_1.default);
router.use("/ia", iaRoutes_1.default);
router.use("/sitemap", sitemapRoutes_1.default);
router.use("/whatsapp", whatsappRoutes_1.default);
exports.default = router;
