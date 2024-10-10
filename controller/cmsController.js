const cmsModel = require("../models/cmsModel");
module.exports = {
  cmsRole: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/loginAdmin");
      let result = await cmsModel.findOne({ role: req.params.role });
      res.render("cms/about", { result, msg: req.flash("msg") });
    } catch (error) {
      console.log("error", error);
    }
  },
  aboutUs: async (req, res) => {
    try {
      let result = await cmsModel.findOne({ role: req.params.role });
      var title;
      if (req.params.role == 3) {
        title = "About Us";
      } else if (req.params.role == 2) {
        title = "Privacy Policy";
      } else if (req.params.role == 1) {
        title = "Terms";
      }
      res.render("dashboard/about", { msg: req.flash("msg"), result, title });
    } catch (error) {
      console.log("error", error);
    }
  },
  update: async (req, res) => {
    try {
      let { description, role, title } = req.body;
      const result = await cmsModel.findByIdAndUpdate(
        { _id: role },
        {
          title: title,
          description: description,
        },
      );
      res.redirect(`/page/${result.role}`);
    } catch (error) {
      return res.status(500).send({
        message: "Server Internal Error",
        sucess: false,
        error: error.message,
      });
    }
  },
};
