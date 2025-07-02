import { Router } from "express";

// Import all subroutes
import authRoutes from "./authRoutes";
import chatRoutes from "./chatRoutes";
import cmsRoutes from "./cmsRoutes";
import dashBoardRoutes from "./dashBoardRoutes";
import eventRoutes from "./eventRoutes";
import iaRoutes from "./iaRoutes";
import profileRoutes from "./profileRoutes";
import sesRoutes from "./sesRoutes";
import sitemapRoutes from "./sitemapRoutes";
import usersRoutes from "./users";
import whatsappRoutes from "./whatsappRoutes";

const router = Router();

// Mount routes
router.use("/", dashBoardRoutes);
router.use("/", cmsRoutes);
router.use("/users", usersRoutes);
router.use("/auth", authRoutes);
router.use("/events", eventRoutes);
router.use("/profile", profileRoutes);
router.use("/chats", chatRoutes);
router.use("/ses", sesRoutes);
router.use("/ia", iaRoutes);
router.use("/sitemap", sitemapRoutes);
router.use("/whatsapp", whatsappRoutes);

export default router;
