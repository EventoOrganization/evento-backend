import express from "express";
import { login } from "../controller/auth/login";
import * as authController from "../controller/authController";
import { authenticateJWT } from "../middleware/authentication";

const router = express.Router();

router.post("/validate-token", authController.validateToken);
router.post("/quick-signup", authController.quickSignup);
router.post("/new-signup", authController.newSignup);
router.post("/signup", authController.signup);
router.post("/login", login);
router.post("/logout", authenticateJWT, authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-otp", authController.verifyOTP);
router.post("/reset-password", authController.resetPassword);
router.delete("/delete-account", authenticateJWT, authController.deleteAccount);

export default router;
