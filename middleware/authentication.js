const jwt = require("jsonwebtoken");
const { Validator } = require("node-input-validator");
const users = require("../models/userModel");
const helper = require("../helper/helper");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const API_SECRET_KEY = process.env.API_SECRET_KEY;
const PUBLISH_KEY = process.env.PUBLISH_KEY;

module.exports = {
  // Middleware pour authentifier via JWT
  authenticateJWT: async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing",
      });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET_KEY);
      console.log("🔑 ~ decoded:", decoded);
      const existingUser = await users.findOne({
        _id: decoded.id,
        email: decoded.email,
      });
      if (!existingUser) {
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
      return res.status(403).json({
        success: false,
        message: message,
      });
    }
  },

  // Middleware pour authentifier les clés d'API
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

    next(); // Passe au middleware suivant si les clés sont valides
  },
};
