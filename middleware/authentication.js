var users = require("../models/userModel");
var jwt = require("jsonwebtoken");
const { Validator } = require("node-input-validator");
const helper = require("../helper/helper");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const API_SECRET_KEY = process.env.API_SECRET_KEY;
const PUBLISH_KEY = process.env.PUBLISH_KEY;

module.exports = {
  authenticateJWT: async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      jwt.verify(token, JWT_SECRET_KEY, async (err, user) => {
        console.log("token", token);
        if (err) {
          console.log(err);

          return res.status(403).json({
            success: false,
            code: 403,
            body: {},
          });
        }
        const existingUser = await users.findOne({
          _id: user.data.id,
          loginTime: user.data.loginTime,
          role: "user",
        });
        if (!existingUser) {
          return res.status(403).json({
            success: false,
            code: 403,
            body: {},
            message: "Authentication error",
          });
        }
        req.user = existingUser;
        next();
      });
    } else {
      res.sendStatus(401);
    }
  },
  authenticateHeader: async function (req, res, next) {
    const v = new Validator(req.headers, {
      secret_key: "required|string",
      publish_key: "required|string",
    });

    let errorsResponse = await helper.checkValidation(v);

    if (errorsResponse) {
      return helper.failed(res, errorsResponse);
    }

    if (
      req.headers.secret_key !== API_SECRET_KEY ||
      req.headers.publish_key !== PUBLISH_KEY
    ) {
      return helper.failed(res, "Key not matched!");
    }
    next();
  },
};
