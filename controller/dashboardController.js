const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const uuid = require("uuid").v4;
const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const { fileUploadLarge, deleteFileFromS3 } = require("../helper/helper");
const helper = require("../middleware/helpers");
const user = require("../models/userModel");
const cohost = require("../models/cohost");
const contactUs = require("../models/contactUs");
const SubInterest = require("../models/subInterestModel");
const interest = require("../models/interestModel");
const events = require("../models/eventModel");
const moment = require("moment");
const path = require("path");
const { ReportModel } = require("../models");
const Models = require("../models");
module.exports = {
  //******************  Render dashboard page **************************** */
  dashboard: async (req, res) => {
    try {
      var title = "Dashboard";
      if (!req.session.user) return res.redirect("/login");
      let userCount = await user.countDocuments({ role: "user" });
      let EventCount = await events.countDocuments();
      let interestCount = await interest.countDocuments();
      let co_host_count = await cohost.countDocuments();
      res.render("dashboard/dashboard", {
        title,
        userCount,
        co_host_count,
        EventCount,
        interestCount,
        msg: req.flash("msg"),
      });
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },

  //***************** Auth ************************* */

  login: async (req, res) => {
    try {
      res.render("admin/login", { layout: false, msg: req.flash("msg") });
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },
  loginAdmin: async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("+++++++", req.body);
      console.log("+++++++", email, password);
      const checkUser = await user.findOne({
        email: "admin@gmail.com",
        role: "admin",
      });

      if (!checkUser) {
        req.flash("msg", "Invalid credentials");
        console.log("++++++++++++", checkUser);
        return res.redirect("/login"); // Utilisez return pour arrêter l'exécution ici
      }

      const checkPassword = await bcrypt.compare(password, checkUser.password);
      console.log("+++++++", checkPassword);
      if (checkPassword) {
        const token = jwt.sign({ userId: checkUser._id }, JWT_SECRET_KEY, {
          expiresIn: "5d",
        });

        let userData = await user
          .findOne({ email: email })
          .select("name phone token email image profileImage");
        userData = JSON.parse(JSON.stringify(userData));
        userData.token = token;

        req.session.user = userData;
        req.flash("msg", "Login Successfully");
        return res.redirect("/dashboard"); // Utilisez return ici aussi
      } else {
        req.flash("msg", "Incorrect password");
        return res.redirect("/login"); // Utilisez return ici également
      }
    } catch (err) {
      console.log("Error:", err);
      req.flash("msg", "An error occurred during login.");
      return res.redirect("/login"); // Assurez-vous que l'exécution se termine après une erreur
    }
  },

  // loginAdmin: async (req, res) => {
  //   try {
  //     console.log("object",req.body);
  //     const email = req.body.email;
  //     const password = req.body.password;
  //     console.log("email===>",email)
  //     const checkEmail = await user.findOne({ email: email, role: "admin" });
  //     if (checkEmail) {
  //       const checkPassword = await bcrypt.compare(password, checkEmail.password);
  //       if (checkPassword) {
  //         console.log("checkPassword",checkPassword)
  //         req.session.user = checkEmail.dataValues;
  //         return res.redirect("/dashboard");
  //       } else {
  //         req.flash("msg", "Incorrect password");
  //         // return res.json(" Invalid Credentials");
  //       }
  //     } else {
  //       // return res.json(" Invalid Credentials");
  //       req.flash("msg", "Incorrect password");
  //     }
  //   } catch (err) {
  //     console.log(err);
  //   }
  // },

  UpdateProfile: async (req, res) => {
    try {
      const { name, email, phoneNumber } = req.body;
      let profileImage;

      if (req.files && req.files.profileImage) {
        var extension = path.extname(req.files.profileImage.name);
        var fileImage = uuid() + extension;
        req.files.profileImage.mv(
          process.cwd() + "/public/images/" + fileImage,
          function (err) {
            if (err) console.log(err);
          },
        );
      }

      const updateFields = {
        name: name,
        email: email,
        phoneNumber: phoneNumber,
        profileImage: fileImage,
      };

      const fetchProfile = await user.findOneAndUpdate(
        { _id: req.session.user._id },
        { $set: updateFields },
        { new: true },
      );
      console.log(req.session.user._id);
      const result = await user.findOne({ _id: req.session.user._id });
      console.log(
        "🚀 ~ file: dashboardController.js:123 ~ UpdateProfile: ~ result:",
        result,
      );

      req.session.user = result;
      req.flash("msg", "Profile Updated Successfully");
      res.redirect("/updateProfile");
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  },
  Profile: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");

      const data = await user.findOne({ email: req.session.user.email });

      var title = "profile";
      res.render("admin/editProfile", { msg: req.flash("msg"), data, title });
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },
  changePassword: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      var title = "change";
      res.render("admin/changePassword", { msg: req.flash("msg"), title });
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },
  editPassword: async (req, res) => {
    const { password, newPassword, confirmPassword } = req.body;

    try {
      var userObj = await user.findById({ _id: req.session.user._id });
      console.log(userObj, "kkkkkkkkkkkkkkkkkkkkk");

      if (userObj) {
        // cl
        const isPasswordValid = await bcrypt.compare(
          password,
          userObj.password,
        );

        if (isPasswordValid) {
          var new_password = await bcrypt.hash(newPassword, 10);
          let create = await user.updateOne(
            { _id: userObj._id },
            {
              password: new_password,
            },
          );
          // console.log(create,"HHHHHHHHHHHHHHHHHHHHHHH");return
          req.session.user = create;
          req.flash("msg", "Password changed successfully");
          return res.redirect("/dashboard");
        } else {
          req.flash("msg", "Old password doesn't matched!");
          return res.redirect("/changePassword");
        }
      } else {
        req.flash("msg", "user not found!");
        return res.redirect("/changePassword");
      }
    } catch (error) {
      console.log("error", error);
      req.flash("msg", "Something went wrong");
      return res.redirect("/changePassword");
    }
  },
  logOut: async (req, res) => {
    try {
      console.log("Inside the logout method");
      req.session.destroy();
      res.redirect("/login");
    } catch (error) {
      console.log(error);
    }
  },

  //********** Interest*********************** */
  addNewInterest: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      const { name } = req.body; // Get the name and image from req.body
      let fileImageUrl = "";

      const newInterest = await interest.create({
        name: name,
        image: fileImageUrl,
      });

      if (req.files && req.files.image) {
        fileImageUrl = await fileUploadLarge(
          req.files.image,
          `interests/${newInterest._id}`,
        );
        await interest.findByIdAndUpdate(newInterest._id, {
          image: fileImageUrl,
        });
      }
      req.flash("msg", "Interst Add Successfully");
      res.redirect("/interests");
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },
  addInterest: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      var title = "interests";
      res.render("interest/addInterest", { msg: req.flash("msg"), title });
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },
  editInterest: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      const data = await interest.findById({ _id: req.params.id });
      var title = "interests";
      res.render("interest/update", { msg: req.flash("msg"), data, title });
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },
  viewInterest: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      const data = await interest
        .findById({ _id: req.params.id })
        .populate("subInterests");
      var title = "interests";
      console.log("DATA", data);
      res.render("interest/view", { msg: req.flash("msg"), data, title });
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },
  interests: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      const data = await interest.find({}).sort({ createdAt: -1 });
      var title = "interests";
      res.render("interest/interestList", {
        msg: req.flash("msg"),
        data,
        title,
      });
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },
  EditInterest: async (req, res) => {
    try {
      const { name } = req.body;

      // Récupérer l'intérêt à mettre à jour
      const interestData = await interest.findById(req.body.id);
      if (!interestData) {
        return res.status(404).send("Interest not found");
      }

      // Vérifier si une nouvelle image est téléchargée
      let fileImageUrl = interestData.image; // Garde l'ancienne image par défaut
      if (req.files && req.files.image) {
        // Supprimer l'ancienne image de S3
        const oldImageKey = interestData.image.split(
          `${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
        )[1];
        if (oldImageKey) {
          await deleteFileFromS3(oldImageKey);
        }

        // Téléverser la nouvelle image sur S3
        fileImageUrl = await fileUploadLarge(
          req.files.image,
          `interests/${req.body.id}`,
        );
      }

      // Préparer les champs à mettre à jour
      const updateFields = {
        name: name,
        image: fileImageUrl, // Utilise l'image actuelle ou la nouvelle image téléchargée
      };

      // Mise à jour de l'intérêt dans la base de données
      await interest.findOneAndUpdate(
        { _id: req.body.id },
        { $set: updateFields },
        { new: true },
      );

      req.flash("msg", "Interest updated successfully");
      res.redirect("/interests");
    } catch (err) {
      console.log("Error updating interest:", err);
      res.status(500).send("Failed to update interest");
    }
  },
  deleteInterest: async (req, res) => {
    try {
      // Récupérer l'intérêt à supprimer
      const interestData = await interest.findById(req.body.id);
      if (!interestData) {
        return res.status(404).send("Interest not found");
      }

      // Suppression de l'image de S3
      const imageUrl = interestData.image; // L'URL complète de l'image stockée
      const key = imageUrl.split(
        `${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
      )[1]; // Extraire le chemin du fichier
      if (key) {
        await deleteFileFromS3(key);
      }

      // Suppression de l'intérêt de la base de données
      const delData = await interest.findByIdAndDelete(req.body.id);
      console.log("Interest deleted:", delData);

      res.json({
        success: true,
        message: "Interest and image deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting interest:", error);
      res.status(500).send("Failed to delete interest");
    }
  },
  addSubInterest: async (req, res) => {
    const interestId = req.params.interestId;
    const interestData = await interest.findById(interestId);

    if (!interestData) {
      req.flash("msg", "Interest not found");
      return res.redirect("/interests");
    }
    const messages = req.flash("msg");
    res.render("interest/addSubInterest", {
      interest: interestData,
      msg: messages.join(" "),
    });
  },
  saveSubInterest: async (req, res) => {
    try {
      const interestId = req.params.interestId;
      const { name } = req.body;
      let imageUrl = "";

      const newSubInterest = await SubInterest.create({
        name: name,
        interest: interestId,
      });

      if (req.files && req.files.image) {
        imageUrl = await fileUploadLarge(
          req.files.image,
          `interests/${interestId}/subInterests/${newSubInterest._id}`,
        );

        await SubInterest.findByIdAndUpdate(newSubInterest._id, {
          image: imageUrl,
        });
      }

      await interest.findByIdAndUpdate(interestId, {
        $push: { subInterests: newSubInterest._id },
      });

      req.flash("msg", "Sub-interest added successfully");
      res.redirect(`/interests`);
    } catch (error) {
      console.error("Error adding sub-interest:", error);
      req.flash("msg", "Error adding sub-interest");
      res.redirect(`/addsubInterest/${req.params.interestId}`);
    }
  },
  viewEditSubInterest: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");

      // Récupérer le sous-intérêt à éditer
      const data = await SubInterest.findById(req.params.id);
      if (!data) {
        req.flash("msg", "Sub-Interest not found");
        return res.redirect("/interests");
      }

      // Afficher la vue d'édition avec les données du sous-intérêt
      res.render("interest/editSubInterest", { msg: req.flash("msg"), data });
    } catch (error) {
      console.error("Error fetching sub-interest:", error);
      req.flash("msg", "Error fetching sub-interest");
      res.redirect("/interests");
    }
  },
  EditSubInterest: async (req, res) => {
    try {
      const { name } = req.body;

      // Récupérer le sous-intérêt à mettre à jour
      const subInterestData = await SubInterest.findById(req.body.id);
      if (!subInterestData) {
        return res.status(404).send("Sub-interest not found");
      }

      // Vérifier si une nouvelle image est téléchargée
      let fileImageUrl = subInterestData.image; // Garde l'ancienne image par défaut
      if (req.files && req.files.image) {
        // Supprimer l'ancienne image de S3
        const oldImageKey = subInterestData.image.split(
          `${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
        )[1];
        if (oldImageKey) {
          await deleteFileFromS3(oldImageKey);
        }

        // Téléverser la nouvelle image sur S3
        fileImageUrl = await fileUploadLarge(
          req.files.image,
          `interests/${subInterestData.interest}/subInterests/${req.body.id}`,
        );
      }

      // Préparer les champs à mettre à jour
      const updateFields = {
        name: name,
        image: fileImageUrl, // Utilise l'image actuelle ou la nouvelle image téléchargée
      };

      // Mise à jour du sous-intérêt dans la base de données
      await SubInterest.findOneAndUpdate(
        { _id: req.body.id },
        { $set: updateFields },
        { new: true },
      );

      req.flash("msg", "Sub-interest updated successfully");
      res.redirect(`/viewInterest/${subInterestData.interest}`);
    } catch (err) {
      console.log("Error updating sub-interest:", err);
      res.status(500).send("Failed to update sub-interest");
    }
  },
  deleteSubInterest: async (req, res) => {
    try {
      const subInterestId = req.body.id;

      // Récupérer le sous-intérêt à supprimer
      const subInterestData = await SubInterest.findById(subInterestId);
      if (!subInterestData) {
        return res.status(404).send("Sub-interest not found");
      }

      // Suppression de l'image de S3
      const imageUrl = subInterestData.image;
      if (imageUrl) {
        const key = imageUrl.split(
          `${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`,
        )[1];
        if (key) {
          await deleteFileFromS3(key);
        }
      }

      // Suppression du sous-intérêt de la base de données
      await SubInterest.findByIdAndDelete(subInterestId);

      // Mise à jour du document Interest principal pour retirer le sous-intérêt
      await interest.findByIdAndUpdate(subInterestData.interest, {
        $pull: { subInterests: subInterestId },
      });

      res.json({
        success: true,
        message: "Sub-interest and image deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting sub-interest:", error);
      res.status(500).send("Failed to delete sub-interest");
    }
  },

  // ********************  Event *****************************/

  viewEvent: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      const data = await events
        .findById({ _id: req.params.id })
        .populate("coHosts");
      // console.log(data,"JJJJJJJJJJJJJJJJJ");return
      var title = "events";
      res.render("events/viewEvent", {
        msg: req.flash("msg"),
        data,
        moment,
        title,
      });
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },
  events: async (req, res) => {
    try {
      // if (!req.session.user) return res.redirect("/login");
      const data = await events
        .find({})
        .sort({ createdAt: -1 })
        .populate("user")
        .populate("coHosts");
      // data.forEach(event => {
      //   event.coHosts.forEach(coHost => {
      //     console.log("Co-host name:", coHost.name);
      //     console.log("Co-host email:", coHost.email);

      //   });
      // });
      var title = "events";
      res.render("events/eventList", {
        msg: req.flash("msg"),
        data,
        moment,
        title,
      });
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },
  event: async (req, res) => {
    const newEvent = new events({
      title: "Birthday",
      eventType: "public",
      interests: ["Dance", "Music", "Cake Cutting"],

      details: {
        name: "BirthDay",
        video: "https://example.com/video",
        images: [
          "https://example.com/image1.jpg",
          "https://example.com/image2.jpg",
        ],
        mode: "in person",
        location: "Bark and Brew Cafe",
        date: new Date(),
        startTime: "10:00 AM",
        endTime: "12:00 PM",
        description: "Its my bday plz you have to come",
        includeChat: false,
      },
      privateEventLink: "",
      rsvpForm: null,
      coHosts: [],
    });
    await newEvent
      .save()
      .then((event) => {
        console.log("Event created:", event);
      })
      .catch((error) => {
        console.error("Error creating event:", error);
      });
  },
  deleteEvent: async (req, res) => {
    try {
      const deldata = await events.findByIdAndDelete({
        _id: req.body.id,
      });
      const deldata1 = await cohost.findOneAndDelete({
        event_id: req.body.id,
      });
      console.log(
        "🚀 ~ file: dashboardController.js:322 ~ deleteuser: ~ deldata:",
        deldata,
      );

      res.json(1);
    } catch (error) {
      console.log(error);
    }
  },

  //************************* USER **************************/

  users: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      const data = await user.find({ role: "user" }).sort({ createdAt: -1 });
      var title = "users";
      res.render("users/userList", { msg: req.flash("msg"), data, title });
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },
  view: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      const data = await user.findById({ _id: req.params.id });
      console.log("this is user", data);
      var title = "users";
      res.render("users/view", { msg: req.flash("msg"), data, moment, title });
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },
  creteusers: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      const { email, name, password } = req.body;
      const data = await user.find({ email: email });
      if (!data) {
        const result = await user.create({
          email: email,
          name: name,
          password: password,
        });
        res.send({ result });
      } else {
        console.log("user already");
      }
    } catch (error) {
      console.log("errr+++++++++++++++++", error);
    }
  },
  Edituser: async (req, res) => {
    try {
      var title = "users";
      if (!req.session.user) return res.redirect("/login");
      let data = await user.findByIdAndUpdate({ _id: req.params.id });
      res.render("users/edit", { title, data, moment, msg: req.flash("msg") });
    } catch (error) {
      console.log(error.message);
    }
  },
  updateUser: async (req, res) => {
    try {
      const { firstName, lastName, email, phoneNumber, DOB } = req.body;

      if (req.files && req.files.profileImage) {
        var extension = path.extname(req.files.profileImage.name);
        var fileImage = uuid() + extension;
        req.files.profileImage.mv(
          process.cwd() + "/public/images/" + fileImage,
          function (err) {
            if (err) console.log(err);
          },
        );
      }
      const updateFields = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        phoneNumber: phoneNumber,
        profileImage: fileImage,
        // DOB: DOB,
        DOB: moment(DOB, "DD-MM-YYYY").toDate(),
      };
      console.log("this is user update==>", updateFields);
      await user.findOneAndUpdate(
        { _id: req.body.id },
        { $set: updateFields },
        { new: true },
      );
      const result = await user.findOne({ _id: req.body.id });

      req.flash("msg", "User Update Successfully");
      res.redirect("/users");
    } catch (err) {
      console.log(err);
    }
  },
  deleteuser: async (req, res) => {
    try {
      await user.findByIdAndDelete({
        _id: req.body.id,
      });
      await events.deleteMany({
        user: req.body.id,
      });
      await Models.EventPhotoVideosModel.deleteOne({
        userId: req.body.id,
      });
      await Models.RSVPSubmission.deleteMany({
        userId: req.body.id,
      });
      await Models.eventAttendesUserModel.deleteMany({
        userId: req.body.id,
      });
      await Models.eventFavouriteUserModel.deleteMany({
        userId: req.body.id,
      });
      await Models.eventNotificationModel.deleteMany({
        reciverId: req.body.id,
      });
      await Models.userFollowModel.deleteMany({
        $or: [{ follower: req.body.id }, { following: req.body.id }],
      });
      await Models.coHostModel.updateMany(
        { cohost_id: req.body.id },
        { $pull: { cohost_id: req.body.id } },
      );

      // await restaurent.findOneAndDelete({ userId: req.body.id });

      res.json(1);

      res.json(0);
    } catch (error) {
      console.log(error);
    }
  },
  deleteuser1: async (req, res) => {
    try {
      const userId = req.body.id;

      // Define an array of delete operations
      const deleteOperations = [
        user.findByIdAndDelete({ _id: userId }),
        events.deleteMany({ user: userId }),
        Models.EventPhotoVideosModel.deleteOne({ userId }),
        Models.RSVPSubmission.deleteMany({ userId }),
        Models.eventAttendesUserModel.deleteMany({ userId }),
        Models.eventFavouriteUserModel.deleteMany({ userId }),
        Models.eventNotificationModel.deleteMany({ reciverId: userId }),
        Models.userFollowModel.deleteMany({
          $or: [{ follower: userId }, { following: userId }],
        }),
        Models.coHostModel.updateMany(
          { cohost_id: userId },
          { $pull: { cohost_id: userId } },
        ),
      ];

      // Run all delete operations concurrently
      await Promise.all(deleteOperations);

      res.json(1);
    } catch (error) {
      console.error(error);
      res.json(0);
    }
  },

  /****************************Co-Host******************************/

  co_host: async (req, res) => {
    try {
      let create_cohost = await cohost.create(req.body);
      res.json(create_cohost);
    } catch (error) {
      console.log(error);
    }
  },
  co_host_list: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      let getList = await cohost
        .find()
        .populate("user_id")
        .populate("cohost_id")
        .populate("event_id");
      // console.log("this is cohost-->", getList);
      console.log("this is the result====?", getList[0].cohost_id);
      title = "Co-host";
      res.render("cohost/cohostList", {
        getList,
        msg: req.flash("msg"),
        title,
      });
    } catch (error) {
      console.log(error);
    }
  },
  delete_cohost: async (req, res) => {
    try {
      let del_cohost = await cohost.findByIdAndDelete({
        _id: req.body.id,
      });
      res.json(1);

      res.json(0);
      // res.redirect("/co_host_list")
    } catch (error) {
      console.log(error);
    }
  },
  contactUs: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      let data = await contactUs.find();
      console.log("this is data-->", data);
      title = "Contact_Us";
      res.render("contactUs/contactUsList", {
        data,
        msg: req.flash("msg"),
        title,
      });
    } catch (error) {
      console.log(error);
    }
  },
  delete_contactUs: async (req, res) => {
    try {
      let del_contactUs = await contactUs.findByIdAndDelete({
        _id: req.body.id,
      });
      res.json(1);

      res.json(0);
      // res.redirect("/co_host_list")
    } catch (error) {
      console.log(error);
    }
  },
  getReport: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      let data = await ReportModel.find()
        .populate("senderId")
        .populate("reciverId");
      console.log("this is data-->", data);
      title = "Contact_Us";
      res.render("contactUs/contactUsList", {
        data,
        msg: req.flash("msg"),
        title,
      });
    } catch (error) {
      console.log(error);
    }
  },
  blockUser: async (req, res) => {
    try {
      if (!req.session.user) return res.redirect("/login");
      let criteria = {
        _id: req.body.reciverId,
      };
      let updatedata = {
        is_block: 1,
      };
      let data = await ReportModel.findOneAndUpdate(criteria, updatedata);
      console.log("this is data-->", data);
      title = "Contact_Us";
      res.render("contactUs/contactUsList", {
        data,
        msg: req.flash("msg"),
        title,
      });
    } catch (error) {
      console.log(error);
    }
  },
};
