// middleware\basemiddleware.js
module.exports = async (req, res, next) => {
  if (req.session.hasOwnProperty("user")) {
    // console.log("this is req.session.user", req.session.user);
    global.adminData = req.session.user;
    // console.log("this is globle.adminData", global.adminData);
  }

  return next();
};
