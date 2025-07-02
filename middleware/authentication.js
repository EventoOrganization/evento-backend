const jwt = require("jsonwebtoken");
const { Validator } = require("node-input-validator");
const users = require("../models/userModel");
const helper = require("../helper/helper");
const { getEnv } = require("../config/env");

const API_SECRET_KEY = getEnv("API_SECRET_KEY");
const PUBLISH_KEY = getEnv("PUBLISH_KEY");

module.exports = {
  authenticateJWT: async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn(
        "[Auth] Missing or malformed Authorization header",
        authHeader,
      );
      return res.status(401).json({
        success: false,
        message: "Authorization header missing or invalid",
      });
    }

    const token = authHeader.split(" ")[1];
    try {
      const jwtSecret = getEnv("JWT_SECRET_KEY");
      const decoded = jwt.verify(token, jwtSecret);

      const existingUser = await users.findOne({
        _id: decoded.id,
        email: decoded.email,
      });

      if (!existingUser) {
        console.warn("[Auth] User not found or session expired:", decoded);
        return res.status(403).json({
          success: false,
          message: "User not found or session expired",
        });
      }

      req.user = existingUser;
      next();
    } catch (error) {
      console.error("JWT verification error:", error.message);
      let message = "Invalid token";
      if (error instanceof jwt.TokenExpiredError) {
        message = "Token has expired";
      } else if (error instanceof jwt.JsonWebTokenError) {
        message = "Token is invalid";
      }
      return res.status(403).json({ success: false, message });
    }
  },

  authenticateHeader: async (req, res, next) => {
    const v = new Validator(req.headers, {
      secret_key: "required|string",
      publish_key: "required|string",
    });

    const errorsResponse = await helper.checkValidation(v);
    if (errorsResponse) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errorsResponse,
      });
    }

    if (
      req.headers.secret_key !== API_SECRET_KEY ||
      req.headers.publish_key !== PUBLISH_KEY
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid API keys",
      });
    }

    next();
  },
};
