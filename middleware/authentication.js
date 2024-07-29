var users=require("../models/userModel")
var jwt = require("jsonwebtoken");
const { Validator } = require("node-input-validator");
const helper = require("../helper/helper");
const SECRETS_KEY = "jnhdscoilwdeicdeswjdk";
const SECRET_KEY =
  "U2FsdGVkX19aDKvxj/Nr/Cp6cb70gK7mBnJzVQ0WYNand9iM1LlcvIRe8qzC44RdN4VPefFG5o2/Q031Mxwv7A==";
const PUBLISH_KEY =
  "U2FsdGVkX1/vYsCHDLw74pt+ZfQPJuOWK2w+l9AMgUfMNVXCXpvz7TDpx6xKd0T1PG8WRFgYy5aaawoo2IDO/g==";

module.exports = {
  authenticateJWT: async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      jwt.verify(token, SECRETS_KEY, async (err, user) => {
        if (err) {
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
            message:"Authentication error"
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
      req.headers.secret_key !== SECRET_KEY ||
      req.headers.publish_key !== PUBLISH_KEY
    ) {
      return helper.failed(res, "Key not matched!");
    }
    next();
  },
};
