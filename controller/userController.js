const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const helper = require("../helper/helper");
const Models = require("../models/index");
const moment = require("moment");
const SendOtp = require("../helper/sendOTP");
const { Validator } = require("node-input-validator");
const nodemailer = require("nodemailer");
const ffmpeg = require("fluent-ffmpeg");
// const mongoose = require('mongoose');
const socket = require("socket.io");
const mongoose = require("mongoose");
const { uploadFileToS3 } = require("../services/s3Service");
const fs = require("fs");
const Event = require("../models/eventModel");
const schedule = require("node-schedule");
// const cronSchedule="* * * * *";
const cronSchedule = "0 0 * * *"; // Runs every night at 12:00 AM
// const cronSchedule1 = "*/10 * * * * *"; // Runs every 10 sec
const cronSchedule1 = "01 0 * * *";

schedule.scheduleJob(cronSchedule, async function () {
  try {
    const todayDate = moment().format("YYYY-MM-DD");
    const findBirthdayUsers = await Models.userModel.find({ DOB: todayDate });

    for (const user of findBirthdayUsers) {
      const followUserList = await Models.userFollowModel.find({
        following: user._id,
      });

      for (const followUser of followUserList) {
        const followerUser = await Models.userModel.findOne({
          _id: followUser.follower,
        });
        console.log("followerUser", followerUser);
        const senderDetail = await Models.userModel.findOne({ role: "admin" });

        const birthdayPersonName =
          user.name || `${user.firstName} ${user.lastName}`;
        const senderName =
          senderDetail.name ||
          `${senderDetail.firstName} ${senderDetail.lastName}`;
        const senderProfile = senderDetail.profileImage || senderDetail.image;
        const deviceToken = followerUser.deviceToken;
        const deviceType = followerUser.deviceType;

        const sendNotification = {
          senderId: senderDetail._id.toString(),
          senderName,
          senderProfile,
          reciverId: followerUser._id.toString(),
          deviceType,
          deviceToken,
          message: `It's ${birthdayPersonName}'s birthday today!`,
          notificationType: 4,
        };

        const dataSave = {
          senderId: senderDetail._id.toString(),
          reciverId: followerUser._id.toString(),
          message: `It's ${birthdayPersonName}'s birthday today!`,
          is_read: 0,
          isBirthday: 1,
        };
        await Models.followingNotificationModel.create(dataSave);
        if (deviceToken) {
          await helper.sendPushToIos(sendNotification);
        }
      }
    }
  } catch (error) {
    throw error;
  }
});

schedule.scheduleJob(cronSchedule1, async function () {
  try {
    const tomorrow = moment.utc().add(1, "days").startOf("day"); // Get UTC date for tomorrow at 00:00:00;
    const pastEvents = await Models.eventModel.find({
      "details.date": { $eq: tomorrow },
    });

    let attendEventUserId = [];
    let favouriteEventUserId = [];
    for (const eventIds of pastEvents) {
      let eventName = eventIds.details.name;
      let eventStartTime = eventIds.details.startTime;
      const attendEvent = await Models.eventAttendesUserModel.find({
        eventId: eventIds._id.toString(),
      });
      let favouriteEvent = await Models.eventFavouriteUserModel.find({
        eventId: eventIds._id.toString(),
      });
      if (attendEvent && attendEvent.length > 0) {
        attendEventUserId = attendEvent.map((a) => a.userId.toString());
      }
      if (favouriteEvent && favouriteEvent.length > 0) {
        favouriteEventUserId = favouriteEvent.map((f) => f.userId.toString());
      }
      let userIds = [];
      userIds.push(eventIds.user.toString());
      const userIdsCoHost = eventIds.coHosts.map((e) => e.toString());
      const userIdsGuest = eventIds.guests.map((e) => e.toString());
      let combinedArray = [
        ...userIds,
        ...userIdsCoHost,
        ...userIdsGuest,
        ...attendEventUserId,
        ...favouriteEventUserId,
      ];
      for (let i = 0; i < combinedArray.length - 1; i++) {
        const senderDetail = await Models.userModel.findOne({ role: "admin" });
        const senderName =
          senderDetail.name ||
          `${senderDetail.firstName} ${senderDetail.lastName}`;
        const senderProfile = senderDetail.profileImage || senderDetail.image;
        const reciverId = await Models.userModel.findOne({
          _id: combinedArray[i],
        });
        const deviceToken = reciverId.deviceToken;
        const deviceType = reciverId.deviceType;
        const sendNotification = {
          senderId: senderDetail._id.toString(),
          senderName,
          senderProfile,
          reciverId: reciverId._id.toString(),
          deviceType,
          deviceToken,
          message: ` Reminder you have ${eventName} tomorrow at ${eventStartTime}`,
          eventId: eventIds._id,
        };

        const dataSave = {
          senderId: senderDetail._id.toString(),
          reciverId: reciverId._id.toString(),
          message: ` Reminder you have ${eventName} tomorrow at ${eventStartTime}`,
          is_read: 0,
          eventId: eventIds._id,
          eventName: eventIds?.details?.name,
          data: eventIds?.details?.date,
          startTime: eventIds?.details?.startTime,
          endTime: eventIds?.details?.endTime,
          location: eventIds?.details?.location,
          longitude: eventIds?.details?.longitude,
          latitude: eventIds?.details?.latitude,
          createRSVP: eventIds?.details?.createRSVP,
        };
        await Models.eventNotificationModel.create(dataSave);
        if (deviceToken) {
          await helper.sendPushToIosForEvent(sendNotification);
        }
      }
    }
  } catch (error) {
    throw error;
  }
});

module.exports = {
  // signup: async (req, res) => {
  //   console.log(
  //     "*****************************SIGNUP REQUEST*****************************",
  //   );
  //   console.log("req.body", req.body);

  //   try {
  //     const v = new Validator(req.body, {
  //       name: "required",
  //       email: "required|email",
  //       password: "required",
  //       confirmPassword: "required",
  //     });

  //     const values = JSON.parse(JSON.stringify(v));
  //     let errorsResponse = await helper.checkValidation(v);

  //     if (errorsResponse) {
  //       console.log("Validation errors:", errorsResponse);
  //       return helper.failed(res, errorsResponse);
  //     }

  //     if (req.body.password !== req.body.confirmPassword) {
  //       const errorMessage = "Password and confirm password do not match";
  //       console.log(errorMessage);
  //       return helper.failed(res, errorMessage);
  //     }

  //     const isEmailExist = await Models.userModel.findOne({
  //       email: req.body.email,
  //     });

  //     const isNameExist = await Models.userModel.findOne({
  //       name: { $regex: new RegExp(req.body.name, "i") }, // Case-insensitive search for name
  //     });

  //     if (isNameExist) {
  //       const errorMessage =
  //         "Sorry, this username already exists. Please choose another one.";
  //       console.log(errorMessage);
  //       return helper.failed(res, errorMessage);
  //     }

  //     if (isEmailExist) {
  //       const errorMessage = "Email already registered";
  //       console.log(errorMessage);
  //       return helper.failed(res, errorMessage);
  //     }

  //     let isMobileExist = await Models.userModel.findOne({
  //       phoneNumber: req.body.phoneNumber,
  //     });

  //     if (isMobileExist) {
  //       const errorMessage = "Mobile number already registered";
  //       console.log(errorMessage);
  //       return helper.failed(res, errorMessage);
  //     }

  //     let images = "";
  //     if (req.files && req.files.image) {
  //       var image = req.files.image;
  //       images = await helper.fileUpload(image, "profile");
  //     }

  //     let hash = bcrypt.hashSync(req.body.password, 10);
  //     let time = helper.unixTimestamp();

  //     let dataEnter = await Models.userModel.create({
  //       name: req.body.name,
  //       firstName: req.body.firstName,
  //       lastName: req.body.lastName,
  //       email: req.body.email,
  //       role: "user",
  //       countryCode: req.body.countryCode,
  //       phoneNumber: req.body.phoneNumber,
  //       interest: JSON.parse(req.body.interest),
  //       DOB: req.body.DOB,
  //       deviceToken: req.body.deviceToken,
  //       deviceType: req.body.deviceType,
  //       loginTime: time,
  //       password: hash,
  //       otp: 1111,
  //       is_otp_verify: 0,
  //       is_block: 0,
  //       aboutMe: "",
  //       profileImage: images ? images : "",
  //     });

  //     console.log("User created successfully:", dataEnter);

  //     if (dataEnter) {
  //       let token = jwt.sign(
  //         {
  //           data: {
  //             id: dataEnter.id,
  //             name: dataEnter.name,
  //             email: dataEnter.email,
  //             loginTime: time,
  //           },
  //         },
  //         JWT_SECRET_KEY,
  //         { expiresIn: "30d" },
  //       );
  //       let responseData = {
  //         ...dataEnter.toObject(), // Convert Mongoose document to plain object
  //         token: token, // Add the token to the response data
  //       };
  //       delete responseData.password; // Remove the password field
  //       return helper.success(res, "Signup Successfully", responseData);
  //     }
  //   } catch (error) {
  //     console.log("Signup error:", error.message);
  //     return res.status(500).json({ status: false, message: error.message });
  //   }
  // },
  signup: async (req, res) => {
    try {
      const { email, password, confirmPassword } = req.body;

      // Basic validation
      if (!email || !password || !confirmPassword) {
        return res.status(400).json({ message: "All fields are required." });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match." });
      }

      // Check if the email is already in use
      const existingUser = await Models.userModel.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email is already in use." });
      }

      // Hash password before saving
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create the new user
      const newUser = new Models.userModel({
        email,
        password: hashedPassword,
      });

      await newUser.save();

      // Respond with success message
      return res.status(201).json({
        message: "User created successfully",
        body: {
          _id: newUser._id,
          email: newUser.email,
        },
      });
    } catch (error) {
      console.error("Signup error:", error);
      return res.status(500).json({ message: "Server error." });
    }
  },

  login: async (req, res) => {
    console.log("Login request", req.body);
    try {
      const v = new Validator(req.body, {
        email: "required",
        password: "required",
      });
      const values = JSON.parse(JSON.stringify(v));
      let errorsResponse = await helper.checkValidation(v);

      if (errorsResponse) {
        console.log("Validation errors:", errorsResponse);
        return helper.failed(res, errorsResponse);
      }

      let logData = await Models.userModel.findOne({
        email: v.inputs.email,
      });

      if (!logData) {
        const errorMessage =
          "Sorry, we don’t recognize your user. Please create an account.";
        console.log(errorMessage);
        return helper.failed(res, errorMessage);
      }

      if (logData.is_block == 1) {
        const errorMessage =
          "Your account is blocked by admin. Please contact the admin.";
        console.log(errorMessage);
        return helper.failed(res, errorMessage);
      }

      const checkPassword = await bcrypt.compare(
        v.inputs.password,
        logData.password,
      );

      if (!checkPassword) {
        const errorMessage = "Password is incorrect";
        console.log(errorMessage);
        return helper.failed(res, errorMessage);
      }

      let time = helper.unixTimestamp();

      await Models.userModel.findByIdAndUpdate(
        { _id: logData._id },
        {
          $set: {
            loginTime: time,
            deviceType: req.body.deviceType,
            deviceToken: req.body.deviceToken,
          },
        },
        { new: true },
      );

      let token = jwt.sign(
        {
          data: {
            id: logData.id,
            email: logData.email,
            name: logData.name,
            loginTime: time,
          },
        },
        JWT_SECRET_KEY,
        { expiresIn: "30d" },
      );

      delete logData.password;
      logData = JSON.stringify(logData);
      logData = JSON.parse(logData);
      logData.token = token;
      delete logData.password;

      console.log("User login successful:");
      // console.log("Setting token in cookie:", token);
      res.cookie("token", token, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        secure: true,
        sameSite: "lax",
        // sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: "/",
      });
      console.log("Cookie set with token:", req.cookies.token);
      console.log("Session after login:", req.session);
      return helper.success(res, "User Login Successfully", logData);
    } catch (error) {
      console.log("Login error:", error.message);
      return res.status(500).json({ status: false, message: error.message });
    }
  },

  logOut: async (req, res) => {
    try {
      await Models.userModel.findByIdAndUpdate(
        { _id: req.user._id },
        {
          $set: { loginTime: "0", deviceToken: "" },
        },
        { new: true },
      );
      return helper.success(res, "Logout successfully");
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  deleteAccount: async (req, res) => {
    try {
      const deletedUser = await Models.userModel.deleteOne({
        _id: req.user._id,
      });
      if (deletedUser) {
        await Models.eventModel.deleteMany({ user: req.user._id });
        await Models.userFollowModel.deleteMany({
          follower: req.user._id,
          following: req.user._id,
        });
        await Models.eventAttendesUserModel.deleteMany({
          userId: req.user._id,
        });
        await Models.RSVPSubmission.deleteMany({ userId: req.user._id });
        await Models.coHostModel.deleteOne({ user_id: req.user._id });
        await Models.eventNotificationModel.deleteMany({
          senderId: req.user._id,
          reciverId: req.user._id,
        });
      }
      return helper.success(res, "Account deleted successfully");
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  changePassword: async (req, res) => {
    try {
      const _id = req.user._id;
      const userInfo = await Models.userModel.findOne({
        _id: _id,
      });
      const { oldPassword, newPassword, confirmPassword } = req.body;
      if (newPassword !== confirmPassword) {
        return res.status(401).json({
          status: false,
          message: "New password and confirm password not match",
        });
      }
      let comparePassword = await bcrypt.compare(
        oldPassword,
        userInfo.password,
      );
      if (comparePassword) {
        let hash = await bcrypt.hashSync(newPassword, 10);
        await Models.userModel.findByIdAndUpdate(
          { _id: req.user._id },
          {
            $set: { password: hash },
          },
          { new: true },
        );
        return helper.success(res, "Password Changed successfully");
      } else {
        return helper.failed(res, "Old password does not match");
      }
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },

  //Not use in Mobile
  forgotPassword: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        email: "required|email",
      });
      let errorsResponse = await helper.checkValidation(v);

      if (errorsResponse) {
        return helper.failed(res, errorsResponse);
      }
      const checkEmail = await Models.userModel.findOne({
        email: v.inputs.email,
      });

      if (!checkEmail) {
        return await helper.failed(res, "The email is not register with us");
      }

      let ran_token = Math.random().toString(36).substring(2, 25);

      // ==========================check here============================
      await Models.userModel.findByIdAndUpdate(
        { _id: checkEmail._id },
        {
          $set: { forgotPasswordToken: ran_token },
        },
        { new: true },
      );
      let forgotPasswordUrl = "" + ran_token;
      var baseUrl =
        req.protocol +
        "://" +
        req.get("host") +
        "/users/resetPassword/" +
        checkEmail._id +
        "/" +
        forgotPasswordUrl;

      // ===================================================================================================================
      let forgot_password_html = ` <section
          style="background-color: #d9d9d9; padding: 20px; border-radius: 10px"
        >
          <div style="background-color: white; padding: 10px; border-radius: 10px">
            <h3>Hello User363,</h3>
            <p>Your Forgot Password Link is:</p>
            <p style="text-align: center">
              <a
                href="${baseUrl}"
                style="
                  color: white;
                  background: #14aa78;
                  padding: 10px 20px;
                  border-radius: 10px;
                  text-decoration: none;
                  margin: auto;
                  display: inline-block;
                "
                >RESET PASSWORD .</a
              >
            </p>
    
            <p>Regards,</p>
          </div>
    
          <div style="text-align: center">
            <small
              >Lorem ipsum dolor sit amet <a href="#"> consectetur, </a> adipisicing
              elit. Dicta, maiores?</small
            >
          </div>
        </section>
                  
                  `;

      // ===================================================================================================================
      var transporter = nodemailer.createTransport({
        host: "smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: "28182524df1f82",
          pass: "6a2bf03dbde623",
        },
      });

      // send mail with defined transport object
      let info = await transporter.sendMail({
        from: '" 👻" mailto:test@example.com',
        to: v.inputs.email,
        subject: " Forget Password Link ",
        text: "Hello world?",
        html: forgot_password_html,
      });
      return helper.success(res, "Mail sent successfully.");
    } catch (error) {
      return helper.failed(res, error);
    }
  },
  resetPassword: async (req, res) => {
    try {
      let token = req.params.ran_token;
      let user_id = req.params.id;
      let checkToken = await Models.userModel.findOne({
        forgotPasswordToken: token,
      });

      if (!checkToken?.forgotPasswordToken) {
        res.redirect("/users/linkExpired");
      } else {
        res.render("dashboard/auth/forgotPassword", {
          token: token,
          id: user_id,
          tokenFound: 1,
          layout: false,
        });
      }
    } catch (error) {}
  },
  updateForgetPassword: async (req, res) => {
    try {
      let check_token = await db.users.findOne({
        forgotPasswordToken: req.body.token,
      });

      if (check_token?.forgotPasswordToken) {
        const v = new Validator(req.body, {
          password: "required",
          confirm_password: "required|same:password",
        });

        let errorsResponse = await helper.checkValidation(v);
        if (errorsResponse) {
          return await helper.failed(res, errorsResponse);
        }
        var password = v.inputs.password;
        let hash = await bcrypt.hashSync(password, 10);
        let update_password = await Models.userModel.findOneAndUpdate(
          { forgotPasswordToken: req.body.token },
          {
            $set: { password: hash, forgotPasswordToken: "" },
          },
          { new: true },
        );

        res.redirect("/user/success");
      } else {
        res.redirect("/user/resetPassword/:id/:ran_token", {
          layout: false,
          token: 0,
          id: 0,
          tokenFound: 0,
        });
      }
    } catch (error) {
      return helper.failed(res, error);
    }
  },
  successMsg: async (req, res) => {
    try {
      res.render("dashboard/auth/successMsg", { layout: false });
    } catch (error) {}
  },
  linkExpired: async (req, res) => {
    try {
      res.render("dashboard/auth/linkExpired", { layout: false });
    } catch (error) {}
  },

  //Upto this

  socialLogin: async (req, res) => {
    try {
      const required = {
        socialId: req.body.socialId,
        socialType: req.body.socialType,
        // type: req.body.type,
        email: req.body.email,
        deviceToken: req.body.deviceToken,
        deviceType: req.body.devicdeviceTypee_token,
        name: req.body.name,
      };
      let time = helper.unixTimestamp();
      required.loginTime = time;

      let attributes = {
        attributes: [
          "_id",
          "name",
          "email",
          "type",
          "socialId",
          "loginTime",
          "socialType",
        ],
      };
      // =====================          ++++++++++++++++++++          ================================
      let emailcheck = await Models.userModel.findOne({
        email: required.email,
        socialId: required.socialId,
      });
      if (emailcheck) {
        let newData = await Models.userModel.findByIdAndUpdate(
          { _id: emailcheck._id },
          {
            $set: { loginTime: time },
          },
          { new: true },
        );

        let emailData = await Models.userModel.findOne({
          email: required.email,
          socialId: required.socialId,
        });

        let token = jwt.sign(
          {
            data: {
              ...emailData,
            },
          },
          JWT_SECRET_KEY,
          { expiresIn: "30d" },
        );
        console.log("Token created:", token);
        const values = JSON.parse(JSON.stringify(emailData));
        values.token = token;
        values.allreadyExist = 1;

        return helper.success(res, "User Allready exist", values);
      } else {
        if (!required.name) {
          let nameArr = required.email.split("@");
          required.name = nameArr[0].replace(/^\d+|\d+$/g, "");
        }

        let usedata = await Models.userModel.create(required);
        let userData = await Models.userModel.findOne({
          _id: usedata._id,
        });
        let token = jwt.sign(
          {
            data: {
              ...userData,
            },
          },
          JWT_SECRET_KEY,
          { expiresIn: "30d" },
        );
        userData.token = token;
        userData.allreadyExist = 0;
        return helper.success(res, "User register success ", userData);
      }
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  updateProfile: async (req, res) => {
    try {
      if (req.files && req.files.profileImage) {
        var image = req.files.profileImage;

        if (image) {
          image = await helper.fileUpload(image, "profile");
        }
      }
      let data = await Models.userModel.findById({ _id: req.user._id });

      let objToSave = {};
      objToSave = {
        name: req.body.name,
        aboutMe: req.body.aboutMe,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        countryCode: req.body.countryCode,
        phoneNumber: req.body.phoneNumber,
        DOB: req.body.DOB,
        profileImage: image,
        bio: req.body.bio,
      };
      const isNameExist = await Models.userModel.findOne({
        name: { $regex: new RegExp(req.body.name, "i") }, // Case-insensitive search for name
        _id: { $ne: req.user.id }, // Exclude current user by ID
      });
      if (isNameExist) {
        return helper.failed(
          res,
          "Sorry this username already exists, please choose another one",
        );
      }
      if (req.body && req.body.interest && req.body.interest.length > 0) {
        objToSave.interest = JSON.parse(req.body.interest);
        await Models.userModel.updateOne(
          { _id: req.user._id },
          { $set: { interest: [] } },
        );
      }
      let dataUpdate = await Models.userModel.findByIdAndUpdate(
        { _id: req.user._id },
        {
          $set: objToSave,
        },
        { new: true },
      );
      return helper.success(res, "Profile updated successfully", dataUpdate);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  contactUs: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        name: "required",
        email: "required|email",
        phoneNumber: "required",
        message: "required",
      });

      const values = JSON.parse(JSON.stringify(v));

      let errorsResponse = await helper.checkValidation(v);

      if (errorsResponse) {
        return helper.failed(res, errorsResponse);
      }

      const isUpdated = await Models.contactUsModel.create({
        name: req.body.name,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        message: req.body.message,
      });
      if (isUpdated) {
        return helper.success(res, "Message sent successfuly", isUpdated);
      }
      return helper.failed(res, "not sent");
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  forgotPasswordOTP: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        email: "required|email",
      });
      let errorsResponse = await helper.checkValidation(v);

      if (errorsResponse) {
        return helper.failed(res, errorsResponse);
      }
      const checkEmail = await Models.userModel.findOne({
        email: req.body.email,
      });

      if (!checkEmail) {
        return await helper.failed(res, "The email is not register with us");
      }

      // let ran_token = Math.random().toString(36).substring(2, 25);

      // var otp = Math.floor(1000 + Math.random() * 9000);
      var otp = 1111;
      await Models.userModel.findByIdAndUpdate(
        { _id: checkEmail._id },
        {
          $set: { otp: otp, is_otp_verify: 0 },
        },
        { new: true },
      );
      SendOtp(checkEmail.email, otp, checkEmail.name);
      return helper.success(res, "Mail sent successfully.");
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  otpVerify: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        otp: "required",
        email: "required",
      });

      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.failed(res, errorsResponse);
      }
      let isEmailExist = await Models.userModel.findOne({
        email: req.body.email,
      });
      if (isEmailExist) {
        if (req.body.otp == isEmailExist.otp) {
          let dataUpdate = await Models.userModel.findByIdAndUpdate(
            { _id: isEmailExist._id },
            {
              $set: {
                otp: 1111,
                is_otp_verify: 1,
              },
            },
            { new: true },
          );

          const userDetail = await Models.userModel.findOne(
            { _id: isEmailExist._id },
            {
              _id: 1,
              name: 1,
              email: 1,
              countryCode: 1,
              mobile: 1,
              profileImage: 1,
              otp: 1,
            },
          );

          userDetail.is_otp_verify == 1;
          return await helper.success(
            res,
            "Verify OTP successfully",
            userDetail,
          );
        } else {
          return helper.failed(res, "Otp doesn't Matched!");
        }
      } else {
        return helper.failed(res, "Email doesn't Matched!");
      }
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  resendOtp: async (req, res) => {
    try {
      // var otp = Math.floor(1000 + Math.random() * 9000);
      var otp = 1111;
      const checkEmail = await Models.userModel.findOne({
        email: req.body.email,
      });

      if (!checkEmail) {
        return helper.failed(res, "User not found with this email");
      }

      let update_otp = await Models.userModel.findOneAndUpdate(
        { email: req.body.email },
        {
          $set: {
            otp: otp,
          },
        },
        { new: true },
      );

      if (update_otp) {
        await SendOtp(checkEmail.email, otp, checkEmail.name);
        return await helper.success(res, "Resend OTP successfully");
      } else {
        return helper.failed(res, "Something went wrong");
      }
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  getProfile: async (req, res) => {
    try {
      const userInfo = await Models.userModel
        .findOne({ _id: req.user._id })
        .populate({ path: "interest" });
      const currentDate = new Date();
      currentDate.setUTCHours(0, 0, 0, 0);
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);

      // Format the next date as a string
      const formattedNextDate = nextDate.toISOString();
      console.log("formattedNextDate", formattedNextDate);
      const currentTime = moment(currentDate).format("HH:mm");

      const allEvents = await Models.eventModel
        .find({})
        .populate({
          path: "user",
          select: "firstName lastName name",
        })
        .populate({
          path: "interest",
          select: "_id name profileImage",
        })
        .populate({
          path: "guests",
          select: "firstName lastName name profileImage",
        })
        .populate({
          path: "coHosts",
          select: "firstName lastName name profileImage",
        })
        .exec();

      const upcomingEvents = await Models.eventModel
        .find({
          $or: [
            { user: req.user._id }, // Hosted by the user
            { coHosts: req.user._id }, // User is a co-host
            { guests: req.user._id }, // User is a guest
          ],
        })
        .populate({
          path: "user",
          select: "firstName lastName name",
        })
        .populate({
          path: "interest",
          select: "_id name profileImage",
        })
        .populate({
          path: "guests",
          select: "firstName lastName name profileImage",
        })
        .populate({
          path: "coHosts",
          select: "firstName lastName name profileImage",
        })
        .exec();

      const attendEvents = await Models.eventAttendesUserModel
        .find({ userId: req.user._id })
        .exec();

      const favourtieEvents = await Models.eventFavouriteUserModel
        .find({ userId: req.user._id, favourite: 1 })
        .exec();

      let eventIds = upcomingEvents.map((event) => event._id.toString());
      let attendEventsIds = attendEvents.map((e) => e.eventId.toString());
      let favourtieEventsId = favourtieEvents.map((e) => e.eventId.toString());

      // const upcomingEvents11=[...eventIds ,...favourtieEventsId]
      const upcomingEvents11 = [...eventIds];

      const uniqueEventsSet = new Set(upcomingEvents11);
      const uniqueEventsArray = Array.from(uniqueEventsSet);

      const filteredEvents = allEvents.filter((event) => {
        return uniqueEventsArray.includes(event._id.toString());
      });

      const pastEvents = await Models.eventModel
        .find({
          $or: [
            { user: req.user._id }, // Hosted by the user
            { coHosts: req.user._id }, // User is a co-host
            { guests: req.user._id }, // User is a guest
          ],
        })
        .populate({
          path: "user",
          select: "firstName lastName name",
        })
        .populate({
          path: "interest",
          select: "_id name image",
        })
        .populate({
          path: "guests",
          select: "firstName lastName name  profileImage",
        })
        .populate({
          path: "coHosts",
          select: "firstName lastName name  profileImage",
        })
        .exec();
      let ID = req.user._id.toString();

      let eventIdsPast = pastEvents.map((event) => event._id.toString());
      let filterPastEvent = [...eventIdsPast, ...favourtieEventsId];
      const uniqueEventsSetPast = new Set(filterPastEvent);
      const uniqueEventsArrayPast = Array.from(uniqueEventsSetPast);

      const filteredEventsPast = allEvents.filter((event) => {
        return uniqueEventsArrayPast.includes(event._id.toString());
      });
      const filteredPastEvents = filteredEventsPast.filter((event) => {
        const endDate = event.details.endDate
          ? new Date(event.details.endDate)
          : new Date();
        const endTimeStr = event.details.endTime; // Assuming details.endTime is a time string in HH:mm AM/PM format

        const endTime = moment(endTimeStr, "h:mm A").format("HH:mm");
        const eventDateTime = moment(endDate)
          .add(Number(endTime.split(":")[0]), "hours")
          .add(Number(endTime.split(":")[1]), "minutes");
        var time = Date.now();
        if (!endTimeStr) {
          return false;
        }
        var dateObj = new Date(time);
        dateObj.setHours(dateObj.getHours() + 5);
        dateObj.setMinutes(dateObj.getMinutes() + 30);
        var newTime = dateObj.getTime();
        var n = newTime / 1000;
        newTime = Math.floor(n);

        const coHostFound = event.coHosts.some(
          (coHost) => coHost._id.toString() == ID,
        );
        event.coHostStatus = coHostFound;
        return newTime > moment(eventDateTime, "YYYY-MM-DD HH:mm:ss").unix();
      });

      const filteredUpcomingEvents = filteredEvents.filter((event) => {
        const endDate = new Date(event.details.endDate); // Assuming details.endDate is a Date object
        const endTimeStr = event.details.endTime; // Assuming details.endTime is a time string in HH:mm AM/PM format
        if (!endTimeStr) {
          return true;
        }
        const endTime = moment(endTimeStr, "h:mm A").format("HH:mm");
        const eventDateTime = moment(endDate)
          .add(Number(endTime.split(":")[0]), "hours")
          .add(Number(endTime.split(":")[1]), "minutes");
        var time = Date.now();
        var dateObj = new Date(time);
        dateObj.setHours(dateObj.getHours() + 5);
        dateObj.setMinutes(dateObj.getMinutes() + 30);
        var newTime = dateObj.getTime();
        var n = newTime / 1000;
        newTime = Math.floor(n);
        return newTime < moment(eventDateTime, "YYYY-MM-DD HH:mm:ss").unix();
      });

      // const upcomingEvents22=[...attendEventsIds]
      const upcomingEvents22 = [...attendEventsIds, ...favourtieEventsId];

      const uniqueEventsSet33 = new Set(upcomingEvents22);
      const uniqueEventsArray44 = Array.from(uniqueEventsSet33);
      const filteredEventsPast55 = allEvents.filter((event) => {
        return uniqueEventsArray44.includes(event._id.toString());
      });

      const filteredPastEventsAttended = filteredEventsPast55.filter(
        (event) => {
          const endDate = new Date(event.details.endDate); // Assuming details.endDate is a Date object
          const endTimeStr = event.details.endTime; // Assuming details.endTime is a time string in HH:mm AM/PM format

          const endTime = moment(endTimeStr, "h:mm A").format("HH:mm");
          const eventDateTime = moment(endDate)
            .add(Number(endTime.split(":")[0]), "hours")
            .add(Number(endTime.split(":")[1]), "minutes");
          var time = Date.now();
          if (!endTimeStr) {
            return false;
          }
          var dateObj = new Date(time);
          dateObj.setHours(dateObj.getHours() + 5);
          dateObj.setMinutes(dateObj.getMinutes() + 30);
          var newTime = dateObj.getTime();
          var n = newTime / 1000;
          newTime = Math.floor(n);
          const coHostFound = event.coHosts.some(
            (coHost) => coHost._id.toString() == ID,
          );
          event.coHostStatus = coHostFound;
          return newTime > moment(eventDateTime, "YYYY-MM-DD HH:mm:ss").unix();
        },
      );

      const filteredUpcomingEventsAttened = filteredEventsPast55.filter(
        (event) => {
          const endDate = new Date(event.details.endDate); // Assuming details.endDate is a Date object
          const endTimeStr = event.details.endTime; // Assuming details.endTime is a time string in HH:mm AM/PM format
          if (!endTimeStr) {
            return true;
          }
          const endTime = moment(endTimeStr, "h:mm A").format("HH:mm");
          const eventDateTime = moment(endDate)
            .add(Number(endTime.split(":")[0]), "hours")
            .add(Number(endTime.split(":")[1]), "minutes");
          var time = Date.now();
          var dateObj = new Date(time);
          dateObj.setHours(dateObj.getHours() + 5);
          dateObj.setMinutes(dateObj.getMinutes() + 30);
          var newTime = dateObj.getTime();
          var n = newTime / 1000;
          newTime = Math.floor(n);
          return newTime < moment(eventDateTime, "YYYY-MM-DD HH:mm:ss").unix();
        },
      );

      // Now filteredPastEvents contains only past events
      let countFollowing = await Models.userFollowModel.countDocuments({
        follower: req.user._id,
      });
      let countTotalEventIAttended =
        await Models.eventAttendesUserModel.countDocuments({
          userId: req.user._id,
        });
      let obj = {};
      obj.userInfo = userInfo;
      obj.upcomingEvents = filteredUpcomingEvents;
      obj.pastEvents = filteredPastEvents;
      obj.following = countFollowing;
      obj.totalEventAttended = countTotalEventIAttended;
      obj.filteredPastEventsAttended = filteredPastEventsAttended;
      obj.filteredUpcomingEventsAttened = filteredUpcomingEventsAttened;
      if (userInfo.password) {
        delete userInfo.password;
        delete userInfo.otp;
        return helper.success(res, "Profile get Successfully", obj);
      }

      return helper.success(res, "Profile get Successfully", obj);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  getInterestsListing: async (req, res) => {
    console.log("Entering getInterestsListing");

    try {
      console.log("Fetching interests from database...");
      let interestList = await Models.interestModel.find();
      // console.log("Interest List from DB:", interestList);

      return helper.success(res, "Interest list", interestList);
    } catch (error) {
      console.error("Error in getInterestsListing:", error);
      return res.status(401).json({ status: false, message: error.message });
    }
  },

  allUserListing: async (req, res) => {
    try {
      let result = {};
      let count = await Models.userModel.countDocuments({ role: "user" });
      let allUserListing = await Models.userModel.find({ role: "user" });
      result.count = count;
      result.allUserListing = allUserListing;

      return helper.success(res, "ALl user list", result);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },

  createEventAndRSVPform: async (req, res) => {
    console.log("Received request body:", req.body);
    try {
      let imageUrls = []; // To store image URLs
      let videoName; // To store video URL
      let thumbnail; // To store thumbnail URL

      const {
        name,
        email,
        firstName,
        lastName,
        attendEvent,
        questions,
        additionalField,
        timeSlots,
      } = req.body;

      // Fetching user data from the database
      const senderData = await Models.userModel.findOne({ _id: req.user._id });
      if (!senderData) {
        console.error("User not found:", req.user._id);
        return res
          .status(404)
          .json({ status: false, message: "User not found" });
      }

      // Check if there's a video file in the request
      if (req.files && req.files.video) {
        console.log("Processing video file...");
        let video = Array.isArray(req.files.video)
          ? req.files.video[0]
          : req.files.video;

        // Upload video to S3 and get the URL
        videoName = await helper.fileUpload(video, "videos");
        console.log("Video uploaded to S3:", videoName);

        // Generate and upload a thumbnail if needed
        if (req.body.type == 2) {
          try {
            const thumbnailPath = `${process.cwd()}/public/images/videos/${videoName}thumbnail.jpg`;

            // Generate thumbnail using ffmpeg
            console.log("Starting thumbnail generation...");
            await new Promise((resolve, reject) => {
              ffmpeg(`${process.cwd()}/public/images/videos/${videoName}`)
                .screenshots({
                  timestamps: ["05%"],
                  filename: `${videoName}thumbnail.jpg`,
                  folder: `${process.cwd()}/public/images/videos/`,
                  size: "320x240",
                })
                .on("end", () => {
                  console.log("Thumbnail generated successfully.");
                  resolve();
                })
                .on("error", (err) => {
                  console.error("Error generating thumbnail:", err);
                  reject(err);
                });
            });

            // Upload thumbnail to S3
            console.log("Uploading thumbnail to S3...");
            thumbnail = await helper.fileUpload(
              {
                name: `${videoName}thumbnail.jpg`,
                data: fs.readFileSync(thumbnailPath),
                mimetype: "image/jpeg",
              },
              "videos",
            );
            console.log("Thumbnail uploaded to S3:", thumbnail);

            // Delete the local thumbnail file after upload
            fs.unlinkSync(thumbnailPath);
          } catch (error) {
            console.error(
              "Error during thumbnail generation or upload:",
              error,
            );
            throw new Error("Thumbnail generation or upload failed");
          }
        }
      }

      // Check if there are images in the request and upload them to S3
      if (req.files && req.files.images) {
        console.log("Processing image files...");
        const uploadedImages = Array.isArray(req.files.images)
          ? req.files.images
          : [req.files.images];

        for (const image of uploadedImages) {
          const imageName = await helper.fileUpload(image, "events");
          imageUrls.push(imageName); // Add image URL to the list
          console.log("Image uploaded to S3:", imageName);
        }
      }
      if (req.files) {
        const imageFiles = Object.keys(req.files)
          .filter((key) => key.startsWith("images"))
          .map((key) => req.files[key]);

        console.log("Fichiers image:", imageFiles);

        for (const image of imageFiles) {
          const imageName = await helper.fileUpload(image, "events");
          imageUrls.push(imageName);
          console.log("Image uploaded to S3:", imageName);
        }
      }
      if (timeSlots) {
        try {
          parsedTimeSlots = JSON.parse(timeSlots);
        } catch (error) {
          console.error("Error parsing timeSlots:", error.message);
          return res.status(400).json({
            status: false,
            message: "Invalid JSON format in timeSlots",
          });
        }
      }
      // Preparing the RSVP form if required
      let rsvpForm = {};
      if (req.body.createRSVP && req.body.createRSVP == "true") {
        try {
          const parsedQuestions = JSON.parse(questions);
          const parsedAdditionalFields = JSON.parse(additionalField);
          console.log("Parsed questions:", parsedQuestions);
          console.log("Parsed additional fields:", parsedAdditionalFields);
          rsvpForm = {
            name: "",
            email: email || "",
            firstName: firstName || "",
            lastName: lastName || "",
            attendEvent: attendEvent || "",
            questions: parsedQuestions, // Default to an empty array if undefined
            additionalField: parsedAdditionalFields, // Default to an empty array if undefined
          };
          if (
            rsvpForm.additionalField &&
            Array.isArray(rsvpForm.additionalField)
          ) {
            rsvpForm.additionalField.forEach((field) => {
              rsvpForm.additionalField[field.name] = field.required ? "" : null;
            });
          }
        } catch (error) {
          console.error(
            "Error parsing RSVP questions or additional fields:",
            error.message,
          );
          return res.status(400).json({
            status: false,
            message: "Invalid JSON format in RSVP data",
          });
        }
      }
      // Prepare the event object to save in the database
      const objToSave = {
        user: req.user._id,
        title: req.body.title,
        eventType: req.body.eventType,
        details: {
          name: req.body.name,
          video: videoName, // Store video URL
          thumbnailVideo: req.body.type == 2 ? thumbnail : "", // Store thumbnail URL if type is 2
          images: imageUrls, // Store image URLs
          mode: req.body.mode,
          date: req.body.date,
          endDate: req.body.endDate,
          tages: req.body.tages,
          URLlink: req.body.URLlink,
          startTime: req.body.startTime,
          endTime: req.body.endTime,
          description: req.body.description,
          includeChat: req.body.includeChat,
          createRSVP: req.body.createRSVP,
          timeSlots: parsedTimeSlots,
        },
        privateEventLink: req.body.privateEventLink,
        guestsAllowFriend: req.body.guestsAllowFriend,
        allUploadPhotoVideo: 1,
        coHostStatus: false,
      };

      // Handle location details if provided
      if (req.body.latitude && req.body.longitude) {
        objToSave.details.location = req.body.location;
        objToSave.details.loc = {
          type: "Point",
          coordinates: [
            req.body.longitude, // longitude
            req.body.latitude, // latitude
          ],
        };
      }

      // Handle co-hosts if provided
      if (req.body.coHosts) {
        const parsedCoHosts = JSON.parse(req.body.coHosts);
        parsedCoHosts.push(req.user._id.toString()); // Add current user as co-host
        objToSave.coHosts = parsedCoHosts;
      } else {
        objToSave.coHosts = req.user._id.toString();
      }

      // Handle guests if provided
      if (req.body.guests) {
        objToSave.guests = JSON.parse(req.body.guests);
      }

      // Handle interests if provided
      if (req.body.interestId) {
        objToSave.interest = JSON.parse(req.body.interestId);
      }

      // Handle RSVP form if required
      if (req.body.createRSVP && req.body.createRSVP == "true") {
        try {
          objToSave.rsvpForm = {
            name: "",
            email: email ? email : "",
            firstName: firstName ? firstName : "",
            lastName: lastName ? lastName : "",
            attendEvent: attendEvent ? attendEvent : "",
            questions: JSON.parse(questions),
            additionalField: JSON.parse(additionalField),
          };
          if (additionalField && Array.isArray(additionalField)) {
            additionalField.forEach((field) => {
              objToSave.rsvpForm.additionalField[field.name] = field.required
                ? ""
                : null;
            });
          }
        } catch (error) {
          console.error(
            "Error parsing RSVP questions or additional fields:",
            error,
          );
          return res.status(400).json({
            status: false,
            message: "Invalid JSON format in RSVP data",
          });
        }
      }

      // Create the event in the database
      const createEvents = await Models.eventModel.create(objToSave);
      console.log("Event created successfully:", createEvents);

      // Additional logic for public/private events with chat inclusion
      if (
        (req.body.eventType == "private" || req.body.eventType == "public") &&
        req.body.includeChat === "true"
      ) {
        const coHostsArray = req.body.coHosts
          ? JSON.parse(req.body.coHosts)
          : [];
        const guestsArray = req.body.guests ? JSON.parse(req.body.guests) : [];

        const userId = req.user._id.toString();
        let users = [userId, ...coHostsArray, ...guestsArray];

        let uniqueArray = [...new Set(users)]; // Remove duplicates

        const saveData = {
          eventId: createEvents._id,
          admin: req.user._id,
          users: uniqueArray,
          groupName: req.body.name,
          image: imageUrls.length > 0 ? imageUrls[0] : thumbnail, // Use either the first image or the thumbnail
          date: moment().format("YYYY-MM-DD"),
          time: moment().format("LTS"),
        };
        console.log("Creating group chat with data:", saveData);
        await Models.groupChatModel.create(saveData);
      }

      // Send notifications to co-hosts and guests
      const sendNotifications = async (userIds, notificationTo) => {
        const deviceTokens = [];
        for (const userId of userIds) {
          try {
            const deviceToken = await Models.userModel.findOne({ _id: userId });
            if (deviceToken) {
              deviceTokens.push(deviceToken.deviceToken);
            }
          } catch (error) {
            console.error(
              `Error fetching device token for userId ${userId}: ${error}`,
            );
          }
        }

        if (deviceTokens.length > 0) {
          const sendNotification = {
            eventId: createEvents._id,
            senderId: req.user._id,
            senderName:
              senderData.name ||
              `${senderData.firstName} ${senderData.lastName}`,
            senderImage: senderData.profileImage || senderData.image,
            reciverId: userIds,
            deviceToken: deviceTokens,
            message: `You are invited as a ${notificationTo} for ${createEvents.details.name} event`,
          };

          for (const userId of userIds) {
            const notificationDataSave = {
              senderId: req.user._id,
              reciverId: userId,
              message: `You are invited as a ${notificationTo} for ${createEvents.details.name} event`,
              notificationTo: notificationTo,
              is_read: 0,
              eventId: createEvents._id,
              eventName: req.body.name,
              data: req.body.data,
              startTime: req.body.startTime,
              endTime: req.body.endTime,
              location: req.body.location,
              longitude: req.body.longitude,
              latitude: req.body.latitude,
              createRSVP: req.body.createRSVP,
            };
            await Models.eventNotificationModel.create(notificationDataSave);
          }

          await helper.sendPushToIosForEvent(sendNotification);
        }
      };

      // Send notifications
      if (req.body.coHosts && req.body.coHosts.length > 0) {
        await sendNotifications(JSON.parse(req.body.coHosts), "co-host");
      }
      if (req.body.guests && req.body.guests.length > 0) {
        await sendNotifications(JSON.parse(req.body.guests), "guest");
      }

      return helper.success(res, "Event created successfully", createEvents);
    } catch (error) {
      console.error("Error in createEventAndRSVPform:", error);
      return res.status(401).json({ status: false, message: error.message });
    }
  },

  updateEventALl: async (req, res) => {
    try {
      let imageUrls = [];
      let videoName;
      var senderData = await Models.userModel.findOne({ _id: req.user._id });
      if (req.files && req.files.video) {
        const video = req.files.video;
        if (Array.isArray(video)) {
          if (video.length > 0) {
            video = video[0];
          }
        } else {
          video = req.files.video;
        }
        if (req.body.type == 1) {
          videoName = await helper.fileUpload(video, "videos");
        } else if (req.body.type == 2) {
          videoName = await helper.fileUpload(video, "videos");

          await new Promise((resolve, reject) => {
            ffmpeg(`${process.cwd()}/public/images/videos/${videoName}`)
              .screenshots({
                timestamps: ["05%"],
                filename: `${videoName}thumbnail.jpg`,
                folder: `${process.cwd()}/public/images/videos/`,
                size: "320x240",
              })
              .on("end", () => {
                resolve();
              })
              .on("error", (err) => {
                reject(err);
              });
          });
          var thumbnail = `${videoName}thumbnail.jpg`;
        }
      }

      if (req.files && req.files.images) {
        const uploadedImages = Array.isArray(req.files.images)
          ? req.files.images
          : [req.files.images];

        for (const image of uploadedImages) {
          const imageName = await helper.fileUpload(image, "profile");
          imageUrls.push(imageName);
        }
      }
      let criteria = {
        _id: req.body._id,
      };
      const objToUpdate = {
        user: req.user._id,
        title: req.body.title,
        eventType: req.body.eventType,
        details: {
          name: req.body.name,
          video: videoName,
          thumbnailVideo: req.body.type == 2 ? thumbnail : "",
          images: imageUrls,
          mode: req.body.mode,
          location: req.body.location,
          longitude: req.body.longitude,
          latitude: req.body.latitude,
          date: req.body.date,
          endDate: req.body.endDate,
          tages: req.body.tages,
          URLlink: req.body.URLlink,
          startTime: req.body.startTime,
          endTime: req.body.endTime,
          description: req.body.description,
          includeChat: req.body.includeChat,
          createRSVP: req.body.createRSVP,
        },
        // interest: JSON.parse(req.body.interestId),
        privateEventLink: req.body.privateEventLink,
        // coHosts: JSON.parse(req.body.coHosts),
        // guests:JSON.parse(req.body.guests), //it is array form
        guestsAllowFriend: req.body.guestsAllowFriend,
        allUploadPhotoVideo: 1,
      };
      // Check if latitude and longitude are present in the request body
      if (req.body && req.body.latitude && req.body.longitude) {
        // Merge loc object with the existing details object
        objToSave.details.loc = {
          type: "Point",
          coordinates: [
            req.body.longitude, //longitude
            req.body.latitude, //latitude
          ],
        };
      }
      if (req.body.createRSVP && req.body.createRSVP == true) {
        objToUpdate.rsvpForm = {
          name: "",
          email: email ? email : "",
          firstName: firstName ? firstName : "",
          lastName: lastName ? lastName : "",
          attendEvent: attendEvent ? attendEvent : "",
          questions: JSON.parse(questions),
          additionalField: JSON.parse(additionalField),
        };
        if (additionalField && Array.isArray(additionalField)) {
          additionalField.forEach((field) => {
            objToUpdate.rsvpForm.additionalField[field.name] = field.required
              ? ""
              : null; // Set empty or null value based on required
          });
        }
      }
      if (req.body.coHosts) {
        objToUpdate.coHosts = JSON.parse(req.body.coHosts);
      }
      if (req.body.guests) {
        objToUpdate.guests = JSON.parse(req.body.guests);
      }
      if (req.body.interestId) {
        objToUpdate.interest = JSON.parse(req.body.interestId);
      }
      const updateEvents = await Models.eventModel.updateOne(
        criteria,
        objToUpdate,
      );
      const sendNotifications = async (userIds, notificationTo) => {
        const deviceTokens = [];
        for (const userId of userIds) {
          try {
            const deviceToken = await Models.userModel.findOne({ _id: userId });
            if (deviceToken) {
              deviceTokens.push(deviceToken.deviceToken);
            }
          } catch (error) {
            console.error(
              `Error fetching device token for userId ${userId}: ${error}`,
            );
          }
        }

        if (deviceTokens.length > 0) {
          const sendNotification = {
            eventId: objToUpdate._id,
            senderId: req.user._id,
            senderName: senderData.name
              ? senderData.name
              : senderData.firstName + senderData.lastName,
            senderImage: senderData.profileImage
              ? senderData.profileImage
              : senderData.image,
            reciverId: userIds,
            deviceToken: deviceTokens,
            message: `${updateEvents.details.name} for this event you are ${notificationTo}`,
          };

          for (const userId of userIds) {
            const notificationDataSave = {
              senderId: req.user._id,
              reciverId: userId,
              message: ` ${updateEvents.details.name} for this event you are ${notificationTo}`,
              notificationTo: notificationTo,
              is_read: 0,
              eventId: updateEvents._id,
              eventName: req.body.name,
              data: req.body.data,
              startTime: req.body.startTime,
              endTime: req.body.endTime,
              location: req.body.location,
              longitude: req.body.longitude,
              latitude: req.body.latitude,
            };
            await Models.eventNotificationModel.create(notificationDataSave);
          }

          await helper.sendPushToIosForEvent(sendNotification);
        }
      };
      if (updateEvents && req.body.coHosts.length > 0) {
        if (req.body.coHosts && req.body.coHosts.length > 0) {
          let criteria = {
            event_id: req.body._id,
          };
          let objToUpdate1 = {
            user_id: req.user._id,
            cohost_id: JSON.parse(req.body.coHosts),
            event_id: updateEvents._id,
          };
          await Models.coHostModel.updateOne(criteria, objToUpdate1);
          await sendNotifications(JSON.parse(req.body.coHosts), "co-host");
        }

        if (req.body.guests && req.body.guests.length > 0) {
          await sendNotifications(JSON.parse(req.body.guests), "guest");
        }

        return helper.success(res, "Event Updated successfully", updateEvents);
      } else {
        return helper.success(res, "Event Updated successfully", updateEvents);
      }
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  updateEvent: async (req, res) => {
    try {
      let criteria = {
        _id: req.body._id,
      };

      let findEvent = await Models.eventModel.findOne(criteria);
      var imageUrls = [];
      if (findEvent) {
        var videoName;
        if (req.files && req.files.video) {
          let video = req.files.video;
          if (Array.isArray(video)) {
            if (video.length > 0) {
              video = video[0];
            }
          } else {
            video = req.files.video;
          }
          if (req.body.type == 1) {
            videoName = await helper.fileUpload(video, "videos");
          } else if (req.body.type == 2) {
            videoName = await helper.fileUpload(video, "videos");
            await new Promise((resolve, reject) => {
              ffmpeg(`${process.cwd()}/public/images/videos/${videoName}`)
                .screenshots({
                  timestamps: ["05%"],
                  filename: `${videoName}thumbnail.jpg`,
                  folder: `${process.cwd()}/public/images/videos/`,
                  size: "320x240",
                })
                .on("end", () => {
                  resolve();
                })
                .on("error", (err) => {
                  reject(err);
                });
            });
            var thumbnail = `${videoName}thumbnail.jpg`;
          }
        }

        if (req.files && req.files.images) {
          const uploadedImages = Array.isArray(req.files.images)
            ? req.files.images
            : [req.files.images];

          for (const image of uploadedImages) {
            const imageName = await helper.fileUpload(image, "profile");
            imageUrls.push(imageName);
          }
        }
      }
      const objToUpdate = {
        user: req.user._id,
        privateEventLink: req.body.privateEventLink,
        details: {
          name: req.body.name,
          video:
            req.files && req.files.video ? videoName : findEvent.details.video,
          thumbnailVideo:
            req.body.type == 2 && req.files
              ? thumbnail
              : findEvent.details.thumbnailVideo,
          images: imageUrls,
          location: req.body.location,
          longitude: req.body.longitude,
          latitude: req.body.latitude,
          date: req.body.date,
          URLlink: req.body.URLlink,
          endDate: req.body.endDate,
          tages: req.body.tages,
          startTime: req.body.startTime,
          endTime: req.body.endTime,
          description: req.body.description,
          includeChat: findEvent.details.includeChat,
          createRSVP: findEvent.details.createRSVP,
          mode: findEvent.details.mode,
          includeChat: findEvent.details.includeChat,
        },
      };
      // Check if latitude and longitude are present in the request body
      if (req.body && req.body.latitude && req.body.longitude) {
        // Merge loc object with the existing details object
        objToUpdate.details.loc = {
          type: "Point",
          coordinates: [
            req.body.longitude, //longitude
            req.body.latitude, //latitude
          ],
        };
      }
      if (req.body.interestId) {
        objToUpdate.interest = JSON.parse(req.body.interestId);
      }
      var senderData = await Models.userModel.findOne({ _id: req.user._id });
      const updateEvents = await Models.eventModel.updateOne(
        criteria,
        objToUpdate,
      );
      const updateEvents1 = await Models.eventModel.findOne(criteria);

      const sendNotifications = async (userIds, notificationTo) => {
        const deviceTokens = [];
        for (const userId of userIds) {
          try {
            const deviceToken = await Models.userModel.findOne({ _id: userId });
            if (deviceToken) {
              deviceTokens.push(deviceToken.deviceToken);
            }
          } catch (error) {
            console.error(
              `Error fetching device token for userId ${userId}: ${error}`,
            );
          }
        }

        if (deviceTokens.length > 0) {
          const sendNotification = {
            eventId: objToUpdate._id,
            senderId: req.user._id,
            senderName: senderData.name
              ? senderData.name
              : senderData.firstName + senderData.lastName,
            senderImage: senderData.profileImage
              ? senderData.profileImage
              : senderData.image,
            reciverId: userIds,
            deviceToken: deviceTokens,
            message: `${updateEvents1.details.name} event is updated please check details`,
          };

          for (const userId of userIds) {
            const notificationDataSave = {
              senderId: req.user._id,
              reciverId: userId,
              message: ` ${updateEvents1.details.name} event is updated please check detials`,
              notificationTo: notificationTo,
              is_read: 0,
              eventId: updateEvents1._id,
              eventName: req.body.name,
              data: req.body.data,
              startTime: req.body.startTime,
              endTime: req.body.endTime,
              location: req.body.location,
              longitude: req.body.longitude,
              latitude: req.body.latitude,
            };
            // await Models.eventNotificationModel.create(notificationDataSave);
          }

          await helper.sendPushToIosForEvent(sendNotification);
        }
        if (req.body && req.body.name) {
          let c = await Models.eventNotificationModel.updateMany(
            { eventId: req.body._id },
            {
              $set: {
                message: `You are invited as a ${notificationTo} for ${req.body.name} event`,
                notificationTo: notificationTo,
                eventName: req.body.name,
              },
            },
          );
        }
      };
      let coHosts = findEvent.coHosts
        .map((id) => {
          return id.toString();
        })
        .filter((id) => id !== req.user._id.toString());
      let guests = findEvent.coHosts
        .map((id) => {
          return id.toString();
        })
        .filter((id) => id !== req.user._id.toString());
      if (coHosts.includes(req.user._id.toString())) {
        var updatedCoHosts = coHosts.filter(
          (id) => id !== req.user._id.toString(),
        );
      }
      if (guests.includes(req.user._id.toString())) {
        var updatedguests = guests.filter(
          (id) => id !== req.user._id.toString(),
        );
      }
      coHosts = Array.from(new Set(coHosts));
      guests = Array.from(new Set(guests));
      await sendNotifications(coHosts, "co-host");
      await sendNotifications(guests, "guest");
      return helper.success(res, "Event Updated successfully", updateEvents1);
    } catch (error) {
      throw error;
    }
  },
  getEventById: async (req, res) => {
    try {
      const currentDate = new Date();
      currentDate.setUTCHours(0, 0, 0, 0);
      const { search } = req.query;
      let query = {};

      if (search) {
        query = {
          $or: [
            { eventType: { $regex: search, $options: "i" } },
            { "details.name": { $regex: search, $options: "i" } },
            { "details.mode": { $regex: search, $options: "i" } },
            { "details.location": { $regex: search, $options: "i" } },
          ],
        };
      }

      const virtualEvent1 = await Models.eventModel.findOne({
        _id: req.params.id,
      });
      const virtualEvent = await Models.eventModel
        .findOne({ _id: req.params.id, ...query })
        .populate({
          path: "user",
          select: "firstName lastName name profileImage",
        })
        .populate({
          path: "interest",
          select: "name image",
        })
        .populate({
          path: "guests",
          select: "firstName lastName name profileImage",
        })
        .populate({
          path: "coHosts",
          select: "firstName lastName name profileImage",
        })
        .exec();

      const attendeDetail = await Models.eventAttendesUserModel
        .find({ eventId: req.params.id })
        .populate({
          path: "userId",
          select: "firstName lastName name profileImage",
        });

      const attendeesCount = await Models.eventAttendesUserModel.countDocuments(
        {
          eventId: req.params.id,
        },
      );

      if (!virtualEvent) {
        return res
          .status(404)
          .json({ status: false, message: "Event not found" });
      }

      // Fetch attendance status for the specific user
      let attended = false;
      let favouriteEvent = false;
      let deleteAccess = false;
      let shareAccess = false;
      let resultList = [];

      if (req.user) {
        const attendance = await Models.eventAttendesUserModel
          .findOne({
            userId: req.user._id,
            eventId: req.params.id,
          })
          .exec();
        attended = attendance ? attendance.attendEvent === 1 : false;

        const favourite = await Models.eventFavouriteUserModel
          .findOne({
            userId: req.user._id,
            eventId: req.params.id,
          })
          .exec();
        favouriteEvent = favourite ? favourite.favourite === 1 : false;

        deleteAccess =
          virtualEvent?.user?._id.toString() === req.user._id.toString();
        shareAccess =
          virtualEvent?.user?._id.toString() === req.user._id.toString() ||
          (virtualEvent?.guestsAllowFriend === true &&
            virtualEvent?.guests.some(
              (guest) => guest._id.toString() === req?.user?._id.toString(),
            ));

        const followingList = await Models.userFollowModel.find({
          follower: req.user._id,
        });
        const followedByList = await Models.userFollowModel.find({
          following: req.user._id,
        });

        const followingMap = new Map();
        followingList.forEach((following) => {
          followingMap.set(following.following.toString(), true);
        });

        const followedByMap = new Map();
        followedByList.forEach((followedBy) => {
          followedByMap.set(followedBy.follower.toString(), true);
        });

        resultList = attendeDetail.map((user) => {
          const userId = user.userId ? user?.userId?._id.toString() : "";
          let status = "not-followed";
          if (followingMap.has(userId) && followedByMap.has(userId)) {
            status = "follow-each-other";
          } else if (followingMap.has(userId)) {
            status = "following";
          } else if (followedByMap.has(userId)) {
            status = "followed";
          }
          return {
            user,
            status,
          };
        });
      } else {
        resultList = attendeDetail.map((user) => ({
          user,
          status: "not-followed",
        }));
      }

      // Si groupDetail n'existe pas, on assigne une chaîne vide
      const groupDetail =
        (await Models.groupChatModel.findOne({
          eventId: req.params.id,
        })) || "";

      const currentDate1 = new Date(currentDate);
      const eventDate = new Date(virtualEvent.details.date);
      const currentTimestamp = currentDate1.getTime();
      const eventTimestamp = eventDate.getTime();
      const updateAccess =
        virtualEvent?.user?._id.toString() === req.user?._id.toString();
      const uploadSectionHideShow = eventTimestamp < currentTimestamp;

      let guestsData = virtualEvent.guestsCohostAdd;
      let ID = req.user?._id.toString();
      const coHostIds = virtualEvent1.coHosts.map((coHost) =>
        coHost.toString(),
      );
      const guestsIds = virtualEvent1.guests.map((guest) => guest.toString());
      let accessPermission = true;
      let coHostOrGuestYouAre = false;

      if (ID && virtualEvent1.user.toString() == ID) {
        coHostOrGuestYouAre = true;
      }
      if (ID && guestsIds.includes(ID)) {
        coHostOrGuestYouAre = guestsIds.includes(ID);
      }
      if (ID && coHostIds.includes(ID)) {
        coHostOrGuestYouAre = coHostIds.includes(ID);
      }
      if (ID && virtualEvent1.guestsAllowFriend == true) {
        if (guestsIds.includes(ID)) {
          accessPermission = guestsData.includes(ID);
        }
        if (coHostIds.includes(ID)) {
          accessPermission = guestsData.includes(ID);
        }
      }
      let coHostYouAre = false;
      if (ID && coHostIds.includes(ID)) {
        coHostYouAre = coHostIds.includes(ID);
      }

      // Check event in past or not
      const endDate = new Date(virtualEvent.details.endDate);
      const endTimeStr = virtualEvent.details.endTime;
      const endTime = moment(endTimeStr, "h:mm A").format("HH:mm");
      const eventDateTime = moment(endDate)
        .add(Number(endTime.split(":")[0]), "hours")
        .add(Number(endTime.split(":")[1]), "minutes");

      var time = Date.now();
      var dateObj = new Date(time);
      dateObj.setHours(dateObj.getHours() + 5);
      dateObj.setMinutes(dateObj.getMinutes() + 30);
      var newTime = dateObj.getTime();
      var n = newTime / 1000;
      newTime = Math.floor(n);
      let isPast =
        newTime > moment(eventDateTime, "YYYY-MM-DD HH:mm:ss").unix();

      const eventWithAttendance = {
        ...virtualEvent.toObject(),
        attended: attended,
        attendeesCount: attendeesCount,
        attendess: resultList,
        favourite: favouriteEvent,
        deleteAccess: deleteAccess,
        shareAccess: shareAccess,
        groupDetail: groupDetail, // Ici, on s'assure que groupDetail est toujours défini
        addAccessPermission: accessPermission == false ? "yes" : "no",
        coHostOrGuestYouAre: coHostOrGuestYouAre,
        coHostYouAre: coHostYouAre,
        updateAccess: updateAccess,
        uploadSectionHideShow: uploadSectionHideShow,
        isPast: isPast,
      };

      return helper.success(res, "Event details", eventWithAttendance);
    } catch (error) {
      console.error(error);
      return res.status(401).json({ status: false, message: error.message });
    }
  },

  addCoHostAndGuestInExistingEvent: async (req, res) => {
    try {
      // Type 1 for guests, 2 for coHosts
      const groupId = await Models.groupChatModel.findOne({
        eventId: req.body.eventId,
      });
      const userIdArray = JSON.parse(req.body.userId);
      if (!Array.isArray(userIdArray)) {
        userIdArray = [userIdArray];
      }
      if (groupId) {
        Models.groupChatModel.updateOne(
          { eventId: req.body.eventId },
          {
            $addToSet: {
              users: { $each: userIdArray },
            },
          },
        );
      }

      let updateQuery;
      if (req.body.type === "1") {
        updateQuery = {
          $addToSet: {
            guests: { $each: userIdArray },
            guestsCohostAdd: { $each: userIdArray },
          },
        };
      } else {
        // Assuming you have trimmed the userIdArray previously
        updateQuery = {
          $addToSet: {
            coHosts: { $each: userIdArray },
            guestsCohostAdd: { $each: userIdArray },
          },
        };
      }

      const result = await Models.eventModel.updateMany(
        { _id: req.body.eventId },
        updateQuery,
      );
      const sendNotifications = async (userIds, notificationTo) => {
        const deviceTokens = [];
        for (const userId of userIds) {
          try {
            const deviceToken = await Models.userModel.findOne({ _id: userId });
            if (deviceToken) {
              deviceTokens.push(deviceToken.deviceToken);
            }
          } catch (error) {
            console.error(
              `Error fetching device token for userId ${userId}: ${error}`,
            );
          }
        }
        let createEvents = await Models.eventModel.findOne({
          _id: req.body.eventId,
        });
        let senderData = await Models.userModel.findOne({ _id: req.user._id });
        if (deviceTokens.length > 0) {
          const sendNotification = {
            eventId: createEvents._id,
            senderId: req.user._id,
            senderName: senderData.name
              ? senderData.name
              : senderData.firstName + senderData.lastName,
            senderImage: senderData.profileImage
              ? senderData.profileImage
              : senderData.image,
            reciverId: userIds,
            deviceToken: deviceTokens,
            message: `You are invited as a ${notificationTo} for ${createEvents.details.name} event`,
            // message: `${createEvents.details.name} for this event you are ${notificationTo}`,
          };
          for (const userId of userIds) {
            const notificationDataSave = {
              senderId: req.user._id,
              reciverId: userId,
              // message: ` ${createEvents.details.name} for this event you are ${notificationTo}`,
              message: `You are invited as a ${notificationTo} for ${createEvents.details.name} event`,
              notificationTo: notificationTo,
              is_read: 0,
              eventId: createEvents._id,
              eventName: createEvents.details.name,
              // data:createEvents.data,
              startTime: createEvents.details.startTime,
              endTime: createEvents.details.endTime,
              location: createEvents.details.location,
              longitude: createEvents.details.longitude,
              latitude: createEvents.details.latitude,
              createRSVP: createEvents.details.createRSVP,
            };
            await Models.eventNotificationModel.create(notificationDataSave);
          }

          await helper.sendPushToIosForEvent(sendNotification);
        }
      };

      if (req.body.type == "2") {
        const objToSave1 = {
          user_id: req.user._id,
          cohost_id: JSON.parse(req.body.userId),
          event_id: req.body.eventId,
        };
        await Models.coHostModel.create(objToSave1);
        await sendNotifications(JSON.parse(req.body.userId), "co-host");
      }

      if (req.body.type == "1") {
        console.log("test");
        await sendNotifications(JSON.parse(req.body.userId), "guest");
      }
      return helper.success(res, "Add successfully");
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  removeGuestFromEvent: async (req, res) => {
    try {
      await Models.eventModel.findByIdAndUpdate(
        req.body.eventId,
        { $pull: { guests: req.body.guestId } },
        { new: true },
      );
      return helper.success(res, "Guest remove from event successfully");
    } catch (error) {
      throw error;
    }
  },

  followStatusForAllUsersThatNotAddAsCoHost: async (req, res) => {
    try {
      const loggedInUserId = req.user._id;
      let eventIdToFind = req.body.eventId;
      const userList = await Models.userModel.find({
        $and: [{ _id: { $ne: loggedInUserId } }],
      });

      // const userList = await Models.userModel.find();

      // Find users whom the logged-in user follows
      const followingList = await Models.userFollowModel.find({
        follower: loggedInUserId,
      });

      // Find users who follow the logged-in user
      const followedByList = await Models.userFollowModel.find({
        following: loggedInUserId,
      });

      // Create a map of following users for faster lookup
      const followingMap = new Map();
      followingList.forEach((following) => {
        followingMap.set(following.following.toString(), true);
      });
      // Create a map of followed by users for faster lookup
      const followedByMap = new Map();
      followedByList.forEach((followedBy) => {
        followedByMap.set(followedBy.follower.toString(), true);
      });

      // Prepare the result list with user details and follow status
      const resultList = userList.map((user) => {
        const userId = user._id.toString();
        let status = "not-followed";
        if (followingMap.has(userId) && followedByMap.has(userId)) {
          status = "follow-each-other";
        } else if (followingMap.has(userId)) {
          status = "following";
        } else if (followedByMap.has(userId)) {
          status = "followed";
        }
        return {
          user,
          status,
        };
      });

      // let eventIdToFind="65154c51a91a899f0590325c"
      let event = await Models.eventModel.findById(eventIdToFind);
      let userIds1 = [];
      let userIds2 = [];
      if (event) {
        if (event.guests && Array.isArray(event.guests)) {
          userIds1 = event.guests.filter(
            (id) => id.toString() !== loggedInUserId,
          );
        }
        if (event.coHosts && Array.isArray(event.coHosts)) {
          userIds2 = event.coHosts.filter(
            (id) => id.toString() !== loggedInUserId,
          );
        }
      }
      const mergedUserIds = Array.from(new Set([...userIds1, ...userIds2]));
      const userIdsAsStrings = mergedUserIds.map((id) => id.toString());
      const userIdsTrimmed = userIdsAsStrings.map((id) => id.trim());
      const filteredData = resultList.filter((item) => {
        const userId = String(item.user._id);

        const trimmedUserId = userId.trim();

        return !userIdsTrimmed.includes(trimmedUserId);
      });
      return helper.success(
        res,
        "List of users and their follow status",
        filteredData,
      );
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },

  allAndVirtualEventAndNear: async (req, res) => {
    console.log(
      "🚀 ~ file: userController.js:allAndVirtualEventAndNear ~ req.body:",
      req.body,
    );

    // Ensure that the models are correctly referenced
    const Models = {
      eventModel: Event,
      // other models...
    };

    const mongoose = require("mongoose");
    console.log("Mongoose Connection State:", mongoose.connection.readyState);

    try {
      // Initialize the current date with UTC time at 00:00
      const currentDate = new Date();
      currentDate.setUTCHours(0, 0, 0, 0);

      // Calculate the next day's date
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);

      // Extract parameters from the request body
      const { longitude, latitude, maxDistance, date, interestsID, type } =
        req.body;
      let skips = req.body.skip ? req.body.skip : 0;
      let limits = req.body.limit ? req.body.limit : 10;
      let result; // Variable to store query results
      let countDocuments; // Variable to store the total document count

      // Function to build a text search query
      const searchQuery = (search) => {
        if (!search) return {};
        return {
          $or: [
            { eventType: { $regex: search, $options: "i" } },
            { "details.name": { $regex: search, $options: "i" } },
            { "details.mode": { $regex: search, $options: "i" } },
            { "details.location": { $regex: search, $options: "i" } },
          ],
        };
      };

      // Build the base query
      const baseQuery = {};
      if (date) {
        let givenDate = new Date(date);
        givenDate.setUTCHours(0, 0, 0, 0);
        Object.assign(baseQuery, {
          $and: [
            { "details.date": { $lte: givenDate } },
            { "details.endDate": { $gte: givenDate } },
          ],
        });
      }

      // Add filter by interests if specified
      if (interestsID && interestsID.length > 0) {
        baseQuery.interest = { $in: JSON.parse(interestsID) };
      }

      // Filter by mode (virtual) if specified
      if (type == 2) {
        baseQuery["details.mode"] = "virtual";
      }

      // Filter by geolocation if specified
      if (type == 3 && longitude && latitude) {
        baseQuery["details.loc"] = {
          $geoWithin: {
            $centerSphere: [
              [longitude, latitude],
              maxDistance ? maxDistance / 6378.1 : 20 / 6378.1,
            ],
          },
        };
      }

      // Build the text search query
      const query = searchQuery(req.query.search);
      console.log("Executing geospatial query:", baseQuery);
      // Execute the query to fetch events
      result = await Models.eventModel
        .find({
          ...baseQuery,
          ...query,
          "details.endDate": { $gte: currentDate },
        })
        .limit(parseInt(limits))
        .skip(parseInt(skips) * parseInt(limits))
        .sort({ createdAt: "desc" })
        .populate({
          path: "user",
          select: "firstName lastName name profileImage",
        })
        .populate({
          path: "interest",
          select: "_id name image",
        })
        .populate({
          path: "guests",
          select: "firstName lastName name  profileImage",
        })
        .populate({
          path: "coHosts",
          select: "firstName lastName name  profileImage",
        })
        .exec();

      console.log("Fetched events:", result);

      // Ensure the result is an array
      // If the result is not an array (or is undefined), initialize it to an empty array
      if (!Array.isArray(result)) {
        result = [];
      }

      // If no events are found, return an appropriate response
      if (result.length === 0) {
        return res
          .status(200)
          .json({ status: true, message: "No events found", data: [] });
      }

      // The remaining processing can follow here...
      // For example, handling attendance counts, participant details, etc.

      return res
        .status(200)
        .json({ status: true, message: "Success", data: result });
    } catch (error) {
      // In case of an error, return a response with the error message
      console.error(error);
      return res.status(500).json({ status: false, message: error.message });
    }
  },

  RSVPanswerLog: async (req, res) => {
    try {
      const RSVPanswerLogs = await Models.RSVPSubmission.findOne({
        eventId: req.params.eventId,
      })
        .populate("eventId")
        .populate({
          path: "userId",
          select: "firstName lastName name profileImage",
        })
        .exec();
      return helper.success(res, "List of RSVP Answer logs", RSVPanswerLogs);
    } catch (error) {
      console.error(error);
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  allRSVPanswerLog: async (req, res) => {
    try {
      let details = {};
      const count = await Models.RSVPSubmission.countDocuments({
        eventId: req.params.eventId,
      });
      const RSVPanswerLogs = await Models.RSVPSubmission.find({
        eventId: req.params.eventId,
      })
        .populate("eventId")
        .populate({
          path: "userId",
          select: "firstName lastName name profileImage",
        })
        .exec();
      details.count = count;
      details.RSVPanswerLogs = RSVPanswerLogs;
      return helper.success(res, "List of RSVP Answer logs", details);
    } catch (error) {
      console.error(error);
      return res.status(401).json({ status: false, message: error.message });
    }
  },

  createRSVPSubmission: async (req, res) => {
    try {
      const eventData = await Models.eventModel.findById(req.body.eventId);
      if (!eventData) {
        return res.status(404).json({ error: "Event not found" });
      }

      const newRSVPSubmission = {
        eventId: req.body.eventId,
        userId: req.user._id,
        name: req.body.name,
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        countryCode: req.body.countryCode,
        attendEvent: req.body.attendEvent,
        rsvpAnswers: req.body.questions
          ? JSON.parse(req.body.questions).map((question) => ({
              question: question.question,
              answer: question.answer,
            }))
          : "",
        additionalFieldAnswers: req.body.additionalField
          ? JSON.parse(req.body.additionalField).map((field) => ({
              name: field.name,
              value: field.value,
            }))
          : "",
      };

      let answers = await Models.RSVPSubmission.create(newRSVPSubmission);
      if (
        (req.body.attendEvent && req.body.attendEvent == 1) ||
        req.body.attendEvent == "yes" ||
        req.body.attendEvent == "Yes"
      ) {
        let objToSave = {
          userId: req.user._id,
          eventId: req.body.eventId,
          attendEvent: 1,
        };

        await Models.eventAttendesUserModel.create(objToSave);
      }
      return helper.success(res, "RSVP form submission  successfully", answers);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  myUpcomingEvents1: async (req, res) => {
    try {
      let { date, eventType } = req.query;
      const currentDate = new Date();
      const currentTime = moment(currentDate).format("HH:mm");
      const baseQuery = {};
      if (date) {
        baseQuery["details.date"] = date;
      }
      if (eventType) {
        baseQuery["eventType"] = eventType;
      }
      const upcomingEvents = await Models.eventModel
        .find({
          ...baseQuery,
          $or: [
            {
              "details.endDate": { $gte: currentDate },
              $or: [
                { user: req.user._id },
                { coHosts: { $in: [req.user._id] } },
                { guests: { $in: [req.user._id] } },
              ],
            }, // Date is greater than or equal to today's date
            // {'details.startTime': { $gte: currentTime }}, // Match the given start time
          ],
          // user:req.user._id
          // user:"64df1bf92bfbf73a614f8fd6"
        })
        .populate({
          path: "user",
          select: "firstName lastName name",
        })
        .populate({
          path: "interest",
          select: "_id name image",
        })
        .populate({
          path: "guests",
          select: "firstName lastName name profileImage",
        })
        .populate({
          path: "coHosts",
          select: "firstName lastName name profileImage",
        })
        .exec();
      var eventIds = upcomingEvents.map((event) => event._id);
      // const attendedEventsByMe=await Models.eventAttendesUserModel.find({userId:req.user._id,attendEvent:1}).populate("eventId");
      // for (const objB of attendedEventsByMe) {
      //   const idExistsInArrayA = upcomingEvents.some((eventA) => objB.eventId !== null && eventA._id == objB.eventId._id);
      //   if (!idExistsInArrayA) {
      //     upcomingEvents.push(attendedEventsByMe);
      //   }
      // }
      // var eventIds = upcomingEvents.map(event => event._id);
      const attendCountsUpcomingEvents =
        await Models.eventAttendesUserModel.aggregate([
          {
            $match: {
              eventId: { $in: eventIds },
              attendEvent: 1,
            },
          },
          {
            $group: {
              _id: "$eventId",
              count: { $sum: 1 },
            },
          },
        ]);

      // Create a map to store the attendance counts by eventId
      const attendCountMapUpcomingEvent = new Map();
      attendCountsUpcomingEvents.forEach((entry) => {
        attendCountMapUpcomingEvent.set(entry._id.toString(), entry.count);
      });
      const favouriteCountsUpcomingEvent =
        await Models.eventFavouriteUserModel.aggregate([
          {
            $match: {
              eventId: { $in: eventIds },
              attendEvent: 1,
            },
          },
          {
            $group: {
              _id: "$eventId",
              count: { $sum: 1 },
            },
          },
        ]);

      // Create a map to store the attendance counts by eventId
      const favouriteCountMapUpcomingEvent = new Map();
      favouriteCountsUpcomingEvent.forEach((entry) => {
        favouriteCountMapUpcomingEvent.set(entry._id.toString(), entry.count);
      });
      const hostedByYouEvents = await Models.eventModel
        .find({
          ...baseQuery,
          $or: [
            {
              "details.endDate": { $gte: currentDate },
              $or: [
                { user: req.user._id },
                // { coHosts: { $in: [req.user._id] } },
                // { guests: { $in: [req.user._id] } },
              ],
            }, // Date is greater than or equal to today's date
            // {'details.startTime': { $gte: currentTime }}, // Match the given start time
          ],
          // coHosts: { $in: [req.user._id] },
        })
        .populate({
          path: "user",
          select: "firstName lastName name",
        })
        .populate({
          path: "interest",
          select: "_id name image",
        })
        .populate({
          path: "guests",
          select: "firstName lastName name profileImage",
        })
        .populate({
          path: "coHosts",
          select: "firstName lastName name profileImage",
        })
        .exec();

      var eventId = hostedByYouEvents.map((event) => event._id);
      const attendCountsHostedEvents =
        await Models.eventAttendesUserModel.aggregate([
          {
            $match: {
              eventId: { $in: eventId },
              attendEvent: 1,
            },
          },
          {
            $group: {
              _id: "$eventId",
              count: { $sum: 1 },
            },
          },
        ]);
      // Create a map to store the attendance counts by eventId
      const attendCountMapHostedEvent = new Map();
      attendCountsHostedEvents.forEach((entry) => {
        attendCountMapHostedEvent.set(entry._id.toString(), entry.count);
      });
      const favouriteCountsHostedEvent =
        await Models.eventFavouriteUserModel.aggregate([
          {
            $match: {
              eventId: { $in: eventId },
            },
          },
          {
            $group: {
              _id: "$eventId",
              count: { $sum: 1 },
            },
          },
        ]);
      // Create a map to store the attendance counts by eventId
      const favouriteCountMapHostedEvent = new Map();
      favouriteCountsHostedEvent.forEach((entry) => {
        favouriteCountMapHostedEvent.set(entry._id.toString(), entry.count);
      });

      let upcomingEvent = upcomingEvents.map((event) => {
        const eventIdStr = event._id ? event._id.toString() : "";
        const eventObject =
          event instanceof mongoose.Document ? event.toObject() : event;
        return {
          // ...eventObject,
          ...event.toObject(),
          attendeesCount: attendCountMapUpcomingEvent.get(eventIdStr) || 0,
          favouriteCount: favouriteCountMapUpcomingEvent.get(eventIdStr) || 0,
        };
      });
      let hostedByYouEvent = hostedByYouEvents.map((event) => {
        const eventIdStr = event._id.toString();
        return {
          ...event.toObject(),
          attendeesCount: attendCountMapHostedEvent.get(eventIdStr) || 0,
          favouriteCount: favouriteCountMapHostedEvent.get(eventIdStr) || 0,
        };
      });
      let obj = {
        upcomingEvents: upcomingEvent,
        hostedByYouEvents: hostedByYouEvent,
      };
      return helper.success(res, "List of upcoming events", obj);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },
  myEventsWithChat: async (req, res) => {
    try {
      // Récupérer les événements où l'utilisateur est inscrit ou a un rôle
      const events = await Models.eventModel
        .find({
          $or: [
            { user: req.user._id },
            { coHosts: { $in: [req.user._id] } },
            { guests: { $in: [req.user._id] } },
          ],
          "details.includeChat": true, // Filtrer les événements où le chat est activé
        })
        .populate({
          path: "user",
          select: "firstName lastName name",
        });

      return res.status(200).json({ status: true, events });
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },
  myUpcomingEvents: async (req, res) => {
    try {
      let { date, eventType } = req.query;
      const currentDate = new Date();
      currentDate.setUTCHours(0, 0, 0, 0);
      const currentTime = moment(currentDate).format("HH:mm");
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);

      // Format the next date as a string
      const formattedNextDate = nextDate.toISOString();
      const baseQuery = {};
      if (date) {
        // baseQuery['details.date'] = date;
        baseQuery["details.endDate"] = { $gte: date };
        baseQuery["details.date"] = { $lte: date };
      }
      if (eventType) {
        baseQuery["eventType"] = eventType;
      }
      const rsvpSubmissions = await Models.RSVPSubmission.find({
        userId: req.user._id,
      });
      const rsvpEventIds = new Set();
      rsvpSubmissions.forEach((submission) => {
        rsvpEventIds.add(submission.eventId.toString()); // Add the eventId to the Set
      });
      const upcomingEvents = await Models.eventAttendesUserModel
        .find({ userId: req.user._id })
        .populate({
          path: "eventId",
          match: baseQuery, // Add your filter here
          populate: {
            path: "user",
            select: "firstName lastName name",
          },
        })
        .exec();
      const favourtieEvents = await Models.eventFavouriteUserModel
        .find({ userId: req.user._id, favourite: 1 })
        .populate({
          path: "eventId",
          match: baseQuery, // Add your filter here
          populate: {
            path: "user",
            select: "firstName lastName name",
          },
        })
        .exec();
      let upcomingEventTest = [...upcomingEvents, ...favourtieEvents];
      const hostedByYouEvents = await Models.eventModel
        .find({
          ...baseQuery,
          $or: [
            { user: req.user._id }, // Hosted by the user
            { coHosts: req.user._id }, // User is a co-host
            { guests: req.user._id }, // User is a guest
          ],
        })
        .populate({
          path: "user",
          select: "firstName lastName name",
        })
        .populate({
          path: "interest",
          select: "_id name image",
        })
        .populate({
          path: "guests",
          select: "firstName lastName name profileImage",
        })
        .populate({
          path: "coHosts",
          select: "firstName lastName name profileImage",
        })
        .sort({ createdAt: -1 })
        .exec();

      var eventId = hostedByYouEvents.map((event) => event._id);
      const attendCountsHostedEvents =
        await Models.eventAttendesUserModel.aggregate([
          {
            $match: {
              eventId: { $in: eventId },
              attendEvent: 1,
            },
          },
          {
            $group: {
              _id: "$eventId",
              count: { $sum: 1 },
            },
          },
        ]);
      // Create a map to store the attendance counts by eventId
      const attendCountMapHostedEvent = new Map();
      attendCountsHostedEvents.forEach((entry) => {
        attendCountMapHostedEvent.set(entry._id.toString(), entry.count);
      });
      const favouriteCountsHostedEvent =
        await Models.eventFavouriteUserModel.aggregate([
          {
            $match: {
              eventId: { $in: eventId },
            },
          },
          {
            $group: {
              _id: "$eventId",
              count: { $sum: 1 },
            },
          },
        ]);
      // Create a map to store the attendance counts by eventId
      const favouriteCountMapHostedEvent = new Map();
      favouriteCountsHostedEvent.forEach((entry) => {
        favouriteCountMapHostedEvent.set(entry._id.toString(), entry.count);
      });
      let hostedByYouEvent = hostedByYouEvents.map((event) => {
        const eventIdStr = event ? event._id.toString() : "";
        const hasRSVP = rsvpEventIds.has(eventIdStr);
        return {
          ...event.toObject(),
          attendeesCount: attendCountMapHostedEvent.get(eventIdStr) || 0,
          favouriteCount: favouriteCountMapHostedEvent.get(eventIdStr) || 0,
          fillRSVP: hasRSVP,
        };
      });

      let upcomingEvents1 = upcomingEventTest
        .map((event) => {
          const eventIdStr = event.eventId ? event.eventId._id.toString() : "";
          const rsvpEventIdsArray = Array.from(rsvpEventIds);
          const hasRSVP = rsvpEventIdsArray.some(
            (rsvpId) => eventIdStr === rsvpId,
          );
          return {
            ...event.toObject(),
            fillRSVP: hasRSVP,
          };
        })
        .filter((result) => result.eventId != null);

      // const filteredUpcomingEvents = upcomingEvents1.filter(event => {
      //         const endDate = event.eventId.details.endDate; // Assuming details.endDate is a Date object
      //         return endDate >= currentDate;
      //       });

      //   const filteredUpcomingEvents = upcomingEvents1.filter(event => {
      //     const endDate = new Date(event.eventId.details.endDate); // Assuming details.endDate is a Date object
      //     // const endTime = moment(event.eventId.details.endTime, "HH:mm"); // Assuming details.endTime is a time in HH:mm format
      //     const endTime = moment(event.eventId.details.endTime, "HH:mm").utcOffset(0, false); // Assuming details.endTime is a time in HH:mm format
      //     const eventDateTime = moment(endDate).add(endTime.hour(), 'hours').add(endTime.minute(), 'minutes');
      //     const currentDateTime = moment();
      //     const pastEvent = currentDateTime.isAfter(eventDateTime);
      //     event.pastEvent = pastEvent; // Optionally, you can set pastEvent property here if needed
      //     return !pastEvent;
      // });

      const filteredUpcomingEvents = upcomingEvents1.filter((event) => {
        let ID = req.user._id.toString();
        const coHostIds = event.eventId?.coHosts.map((coHost) =>
          coHost.toString(),
        );
        if (coHostIds.includes(ID)) {
          event.coHostStatus = coHostIds.includes(ID);
        }
        const endDate = new Date(event.eventId.details.endDate); // Assuming details.endDate is a Date object
        const endTimeStr = event.eventId.details.endTime; // Assuming details.endTime is a time string in HH:mm AM/PM format
        if (!endTimeStr) {
          return true;
        }
        const endTime = moment(endTimeStr, "h:mm A").format("HH:mm");
        const eventDateTime = moment(endDate)
          .add(Number(endTime.split(":")[0]), "hours")
          .add(Number(endTime.split(":")[1]), "minutes");
        var time = Date.now();
        var dateObj = new Date(time);
        dateObj.setHours(dateObj.getHours() + 5);
        dateObj.setMinutes(dateObj.getMinutes() + 30);
        var newTime = dateObj.getTime();
        var n = newTime / 1000;
        newTime = Math.floor(n);
        return newTime < moment(eventDateTime, "YYYY-MM-DD HH:mm:ss").unix();
      });

      const filteredhostedByYouEvent = hostedByYouEvent.filter((event) => {
        let ID = req.user._id.toString();
        const coHostIds = event.coHosts.map((coHost) => coHost._id.toString());
        if (coHostIds.includes(ID)) {
          event.coHostStatus = coHostIds.includes(ID);
        }
        const endDate = new Date(event.details.endDate); // Assuming details.endDate is a Date object
        const endTimeStr = event.details.endTime; // Assuming details.endTime is a time string in HH:mm AM/PM format
        if (!endTimeStr) {
          return true;
        }
        const endTime = moment(endTimeStr, "h:mm A").format("HH:mm");
        const eventDateTime = moment(endDate)
          .add(Number(endTime.split(":")[0]), "hours")
          .add(Number(endTime.split(":")[1]), "minutes");
        var time = Date.now();
        var dateObj = new Date(time);
        dateObj.setHours(dateObj.getHours() + 5);
        dateObj.setMinutes(dateObj.getMinutes() + 30);
        var newTime = dateObj.getTime();
        var n = newTime / 1000;
        newTime = Math.floor(n);
        return newTime < moment(eventDateTime, "YYYY-MM-DD HH:mm:ss").unix();
      });

      const uniqueIds = new Set();
      const uniqueEvents = filteredUpcomingEvents.filter((event) => {
        if (uniqueIds.has(event.eventId._id.toString())) {
          return false;
        } else {
          uniqueIds.add(event.eventId._id.toString());
          return true;
        }
      });
      let obj = {
        upcomingEvents: uniqueEvents,
        hostedByYouEvents: filteredhostedByYouEvent,
      };

      return helper.success(res, "List of upcoming events", obj);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },
  myPastEvents: async (req, res) => {
    try {
      const currentDate = new Date();
      const currentTime = moment().format("hh:mm A");
      currentDate.setUTCHours(0, 0, 0, 0);
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + 1);

      // Format the next date as a string
      const formattedNextDate = nextDate.toISOString();

      // Fetch past events hosted by the user
      const pastHostedEvents = await Models.eventModel
        .find({
          $and: [{ "details.endDate": { $lt: formattedNextDate } }],
          user: req.user._id,
        })
        .populate({
          path: "user",
          select: "firstName lastName name",
        })
        .populate({
          path: "interest",
          select: "_id name image",
        })
        .populate({
          path: "guests",
          select: "firstName lastName name profileImage",
        })
        .populate({
          path: "coHosts",
          select: "firstName lastName name profileImage",
        })
        .exec();

      // Fetch past events the user attended but didn't host
      const pastEventsAttended = await Models.eventModel
        .find({
          $and: [
            { "details.endDate": { $lt: formattedNextDate } },
            { guests: req.user._id }, // User is listed as a guest
            { user: { $ne: req.user._id } }, // Exclude events hosted by the user
          ],
        })
        .populate({
          path: "user",
          select: "firstName lastName name",
        })
        .populate({
          path: "interest",
          select: "_id name image",
        })
        .populate({
          path: "guests",
          select: "firstName lastName name profileImage",
        })
        .populate({
          path: "coHosts",
          select: "firstName lastName name profileImage",
        })
        .exec();

      return helper.success(res, "List of past events", {
        pastHostedEvents,
        pastEventsAttended,
      });
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },

  deleteEvent: async (req, res) => {
    try {
      //Fistly check created event is by logged in user or not
      let checkEvent = await Models.eventModel.findOne({ _id: req.params.id });
      if (checkEvent.user.toString() == req.user._id.toString()) {
        let eventDelete = await Models.eventModel.deleteOne({
          _id: req.params.id,
        });
        if (eventDelete) {
          await Models.eventAttendesUserModel.deleteMany({
            eventId: req.params.id,
          });
          await Models.RSVPSubmission.deleteMany({ eventId: req.params.id });
          await Models.coHostModel.deleteOne({ eventId: req.params.id });
          await Models.eventNotificationModel.deleteMany({
            eventId: req.params.id,
          });
          return helper.success(res, "Event delete successfuly");
        }
      }
      return helper.success(res, "This event is not created by you");
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },
  rsvpSubmissionAnswerByUserId: async (req, res) => {
    try {
      const submission = await Models.RSVPSubmission.findOne({
        userId: req.params.userId,
        eventId: req.params.eventId,
      })
        .populate("userId", "firstName lastName email profileImage")
        .sort({ createAt: -1 }); // Populate the userId field with selected fields

      if (!submission) {
        return res
          .status(404)
          .json({ status: false, message: "No record found" });
      }
      return helper.success(res, "Success", submission);
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },
  getProfileUser: async (req, res) => {
    try {
      const currentDate = new Date();
      const currentTime = moment(currentDate).format("HH:mm");

      let userInfo = await Models.userModel.findOne(
        { _id: req.params.id },
        {
          _id: 1,
          name: 1,
          email: 1,
          countryCode: 1,
          phoneNumber: 1,
          otp: 1,
          address: 1,
          profileImage: 1,
          DOB: 1,
          profileImage: 1,
          aboutMe: 1,
          bio: 1,
        },
      );
      let upcomingEvents = await Models.eventModel
        .find({
          $and: [
            // { 'details.endDate': { $gte: currentDate } },
            {
              $or: [
                { user: req.params.id },
                { coHosts: { $in: [req.params.id] } },
                { guests: { $in: [req.params.id] } },
              ],
            },
          ],
        })
        .populate({
          path: "user",
          select: "firstName lastName name",
        })
        .populate({
          path: "interest",
          select: "_id name image",
        })
        .populate({
          path: "guests",
          select: "firstName lastName name profileImage",
        })
        .populate({
          path: "coHosts",
          select: "firstName lastName name profileImage",
        })
        .exec();

      let pastEvents = await Models.eventModel
        .find({
          $and: [
            // { 'details.endDate': { $lt: currentDate } },
            {
              $or: [
                { user: req.params.id },
                { coHosts: { $in: [req.params.id] } },
                { guests: { $in: [req.params.id] } },
              ],
            },
          ],
        })
        .populate({
          path: "user",
          select: "firstName lastName name",
        })
        .populate({
          path: "interest",
          select: "_id name image",
        })
        .populate({
          path: "guests",
          select: "firstName lastName name profileImage",
        })
        .populate({
          path: "coHosts",
          select: "firstName lastName name profileImage",
        })
        .exec();

      let followingStatus = "not-followed"; // Default status

      const followerId = req.user._id;
      const followingId = req.params.id;

      const bothFollow1 = await Models.userFollowModel.findOne({
        follower: followerId,
        following: followingId,
      });
      const bothFollow2 = await Models.userFollowModel.findOne({
        follower: followingId,
        following: followerId,
      });
      if (bothFollow1 && bothFollow2) {
        followingStatus = "follow-each-other";
      } else {
        const userFollow = await Models.userFollowModel.findOne({
          follower: followerId,
          following: followingId,
        });

        if (userFollow) {
          followingStatus = "following";
        } else {
          const reverseUserFollow = await Models.userFollowModel.findOne({
            follower: followingId,
            following: followerId,
          });

          if (reverseUserFollow) {
            followingStatus = "followed";
          }
        }
      }

      //   const filteredPastEvents = pastEvents.filter(event => {
      //     const endDate = new Date(event.details.endDate); // Assuming details.endDate is a Date object
      //     const endTime = moment(event.details.endTime, "HH:mm").utcOffset(0, false); // Assuming details.endTime is a time in HH:mm format
      //     const eventDateTime = moment(endDate).add(endTime.hour(), 'hours').add(endTime.minute(), 'minutes');
      //     const currentDateTime = moment();
      //     return currentDateTime.isAfter(eventDateTime); // Return true if it's a past event
      // });
      let ID = req.user._id.toString();
      const filteredPastEvents = pastEvents.filter((event) => {
        const endDate = new Date(event.details.endDate); // Assuming details.endDate is a Date object
        const endTimeStr = event.details.endTime; // Assuming details.endTime is a time string in HH:mm AM/PM format
        const endTime = moment(endTimeStr, "h:mm A").format("HH:mm");
        const eventDateTime = moment(endDate)
          .add(Number(endTime.split(":")[0]), "hours")
          .add(Number(endTime.split(":")[1]), "minutes");
        var time = Date.now();
        var dateObj = new Date(time);
        dateObj.setHours(dateObj.getHours() + 5);
        dateObj.setMinutes(dateObj.getMinutes() + 30);
        var newTime = dateObj.getTime();
        var n = newTime / 1000;
        newTime = Math.floor(n);
        const coHostFound = event.coHosts.some(
          (coHost) => coHost._id.toString() == ID,
        );
        event.coHostStatus = coHostFound;
        return newTime > moment(eventDateTime, "YYYY-MM-DD HH:mm:ss").unix();
      });

      const filteredUpcomingEvents = upcomingEvents.filter((event) => {
        const endDate = new Date(event.details.endDate); // Assuming details.endDate is a Date object
        const endTimeStr = event.details.endTime; // Assuming details.endTime is a time string in HH:mm AM/PM format
        const endTime = moment(endTimeStr, "h:mm A").format("HH:mm");
        const eventDateTime = moment(endDate)
          .add(Number(endTime.split(":")[0]), "hours")
          .add(Number(endTime.split(":")[1]), "minutes");
        var time = Date.now();
        var dateObj = new Date(time);
        dateObj.setHours(dateObj.getHours() + 5);
        dateObj.setMinutes(dateObj.getMinutes() + 30);
        var newTime = dateObj.getTime();
        var n = newTime / 1000;
        newTime = Math.floor(n);
        return newTime < moment(eventDateTime, "YYYY-MM-DD HH:mm:ss").unix();
      });
      let countFollowing = await Models.userFollowModel.countDocuments({
        follower: req.params.id,
      });
      let countTotalEventIAttended =
        await Models.eventAttendesUserModel.countDocuments({
          userId: req.params.id,
        });

      let obj = {};
      obj.countFollowing = countFollowing;
      obj.countTotalEventIAttended = countTotalEventIAttended;
      obj.userInfo = userInfo;
      (obj.followingStatus = followingStatus),
        (obj.upcomingEvents = filteredUpcomingEvents);
      obj.pastEvents = filteredPastEvents;
      if (userInfo.password) {
        delete userInfo.password;
        delete userInfo.otp;
        return helper.success(res, "Profile get Successfully", obj);
      }
      return helper.success(res, "Profile get Successfully", obj);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },

  //Upload and get images and videos of specific event
  allowAllGuestUploadPhotoVideo: async (req, res) => {
    try {
      let criteria = {
        _id: req.body.eventId,
      };
      let saveData = {
        allUploadPhotoVideo: req.body.allUploadPhotoVideo,
      };
      let save = await Models.eventModel.findByIdAndUpdate(criteria, saveData);
      return helper.success(res, "Update Successfully", save);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  // uploadPhotoVideo: async (req, res) => {
  //   try {
  //     let imageUrls = [];
  //     let videoName = [];
  //     let thumbnail = [];
  //     let checkUserGuestsOrNot = await Models.eventModel.findOne({
  //       _id: req.body.eventId,
  //     });
  //     var exitsUser =
  //       checkUserGuestsOrNot != null
  //         ? checkUserGuestsOrNot.guests.includes(req.user._id) ||
  //           checkUserGuestsOrNot.coHosts.includes(req.user._id)
  //         : false;
  //     if (exitsUser) {
  //       if (req.files && req.files.video) {
  //         const uploadedvideos = Array.isArray(req.files.video)
  //           ? req.files.video
  //           : [req.files.video];
  //         for (const video of uploadedvideos) {
  //           const videoNameUrl = await helper.fileUpload(video, "events");
  //           videoName.push(videoNameUrl);
  //           await new Promise((resolve, reject) => {
  //             ffmpeg(`${process.cwd()}/public/images/events/${videoNameUrl}`)
  //               .screenshots({
  //                 timestamps: ["05%"],
  //                 filename: `${videoNameUrl}thumbnail.jpg`,
  //                 folder: `${process.cwd()}/public/images/events/`,
  //                 size: "320x240",
  //               })
  //               .on("end", () => {
  //                 resolve();
  //               })
  //               .on("error", (err) => {
  //                 console.error(
  //                   `Error generating thumbnail for ${videoNameUrl}:`,
  //                   err,
  //                 );
  //                 reject(err);
  //               });
  //           });
  //           thumbnail.push(`${videoNameUrl}thumbnail.jpg`);
  //         }
  //       }

  //       if (req.files && req.files.images) {
  //         const uploadedImages = Array.isArray(req.files.images)
  //           ? req.files.images
  //           : [req.files.images];

  //         for (const image of uploadedImages) {
  //           const imageName = await helper.fileUpload(image, "events");
  //           imageUrls.push(imageName);
  //         }
  //       }
  //       //Find already images and video upload by user in same event then update other wise create
  //       let result;
  //       let checkPermission = {
  //         _id: req.body.eventId,
  //       };
  //       let checkPermissionUpload =
  //         await Models.eventModel.findById(checkPermission);
  //       if (checkPermissionUpload.allUploadPhotoVideo == 1) {
  //         let findBeforeAdd = await Models.EventPhotoVideosModel.find({
  //           userId: req.user._id,
  //           eventId: req.body.eventId,
  //         });
  //         let criteria = {
  //           userId: req.user._id,
  //           eventId: req.body.eventId,
  //         };
  //         let objToUpdate = {
  //           images: imageUrls,
  //           video: videoName,
  //           thumbnailVideo: thumbnail,
  //         };
  //         if (findBeforeAdd.length > 0) {
  //           // result=await Models.EventPhotoVideosModel.updateOne(criteria,objToUpdate)
  //           result = await Models.EventPhotoVideosModel.updateOne(
  //             { eventId: req.body.eventId, userId: req.user._id },
  //             {
  //               $addToSet: {
  //                 images: { $each: imageUrls },
  //                 video: { $each: videoName },
  //                 thumbnailVideo: { $each: thumbnail },
  //               },
  //             },
  //           );
  //           result = await Models.EventPhotoVideosModel.findOne({
  //             eventId: req.body.eventId,
  //             userId: req.user._id,
  //           });
  //         } else {
  //           let objToSave = {
  //             ...criteria,
  //             ...objToUpdate,
  //           };
  //           result = await Models.EventPhotoVideosModel.create(objToSave);
  //         }
  //         return helper.success(res, "Added Successfully", result);
  //       } else {
  //         return helper.failed(
  //           res,
  //           "No permission to upload video/Image for this event",
  //         );
  //       }
  //     } else {
  //       return helper.failed(res, "You are not coHost or guest in this event");
  //     }
  //   } catch (error) {
  //     return res.status(401).json({ status: false, message: error.message });
  //   }
  // },
  uploadPhotoVideo: async (req, res) => {
    try {
      let imageUrls = [];
      let videoUrls = [];
      let thumbnailUrls = [];
      let checkUserGuestsOrNot = await Models.eventModel.findOne({
        _id: req.body.eventId,
      });
      var exitsUser =
        checkUserGuestsOrNot != null
          ? checkUserGuestsOrNot.guests.includes(req.user._id) ||
            checkUserGuestsOrNot.coHosts.includes(req.user._id)
          : false;
      if (exitsUser) {
        if (req.files && req.files.video) {
          const uploadedvideos = Array.isArray(req.files.video)
            ? req.files.video
            : [req.files.video];
          for (const video of uploadedvideos) {
            const videoName = video.name;
            const videoPath = video.path;

            // Upload video to S3
            const videoUrl = await uploadFileToS3(videoPath, videoName);
            videoUrls.push(videoUrl);

            // Generate thumbnail and upload to S3
            const thumbnailName = `${videoName}-thumbnail.jpg`;
            await new Promise((resolve, reject) => {
              ffmpeg(videoPath)
                .screenshots({
                  timestamps: ["05%"],
                  filename: thumbnailName,
                  folder: "/tmp/", // Use temp folder to generate the thumbnail locally
                  size: "320x240",
                })
                .on("end", async () => {
                  const thumbnailPath = `/tmp/${thumbnailName}`;
                  const thumbnailUrl = await uploadFileToS3(
                    thumbnailPath,
                    thumbnailName,
                  );
                  thumbnailUrls.push(thumbnailUrl);
                  fs.unlinkSync(thumbnailPath); // Clean up the local thumbnail
                  resolve();
                })
                .on("error", (err) => {
                  console.error(
                    `Error generating thumbnail for ${videoName}:`,
                    err,
                  );
                  reject(err);
                });
            });

            // Clean up the local video file
            fs.unlinkSync(videoPath);
          }
        }

        if (req.files && req.files.images) {
          const uploadedImages = Array.isArray(req.files.images)
            ? req.files.images
            : [req.files.images];

          for (const image of uploadedImages) {
            const imageName = image.name;
            const imagePath = image.path;

            // Upload image to S3
            const imageUrl = await uploadFileToS3(imagePath, imageName);
            imageUrls.push(imageUrl);

            // Clean up the local image file
            fs.unlinkSync(imagePath);
          }
        }

        // Rest of the code remains the same, except you now work with URLs from S3
        let result;
        let checkPermission = {
          _id: req.body.eventId,
        };
        let checkPermissionUpload = await Models.eventModel.findById(
          checkPermission,
        );
        if (checkPermissionUpload.allUploadPhotoVideo == 1) {
          let findBeforeAdd = await Models.EventPhotoVideosModel.find({
            userId: req.user._id,
            eventId: req.body.eventId,
          });
          let criteria = {
            userId: req.user._id,
            eventId: req.body.eventId,
          };
          let objToUpdate = {
            images: imageUrls,
            video: videoUrls,
            thumbnailVideo: thumbnailUrls,
          };
          if (findBeforeAdd.length > 0) {
            result = await Models.EventPhotoVideosModel.updateOne(
              { eventId: req.body.eventId, userId: req.user._id },
              {
                $addToSet: {
                  images: { $each: imageUrls },
                  video: { $each: videoUrls },
                  thumbnailVideo: { $each: thumbnailUrls },
                },
              },
            );
            result = await Models.EventPhotoVideosModel.findOne({
              eventId: req.body.eventId,
              userId: req.user._id,
            });
          } else {
            let objToSave = {
              ...criteria,
              ...objToUpdate,
            };
            result = await Models.EventPhotoVideosModel.create(objToSave);
          }
          return helper.success(res, "Added Successfully", result);
        } else {
          return helper.failed(
            res,
            "No permission to upload video/Image for this event",
          );
        }
      } else {
        return helper.failed(res, "You are not coHost or guest in this event");
      }
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  getEventPhotoVideoUploadByUser: async (req, res) => {
    try {
      let result = await Models.EventPhotoVideosModel.find({
        eventId: req.body.eventId,
      })
        .populate({
          path: "userId",
          select: "firstName lastName name profileImage",
        })
        .populate({
          path: "eventId",
          select: "allUploadPhotoVideo",
        });
      return helper.success(res, "Data is", result);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  isAttending: async (req, res) => {
    try {
      const userId = req.user._id;
      const eventId = req.params.eventId;

      const isAttending = await Models.eventAttendesUserModel.findOne({
        eventId: eventId,
        userId: userId,
      });

      if (isAttending) {
        return res.status(200).json({ attending: true });
      } else {
        return res.status(200).json({ attending: false });
      }
    } catch (error) {
      return res.status(500).json({ status: false, message: error.message });
    }
  },
  isFavourite: async (req, res) => {
    try {
      const { eventId } = req.params;
      const userId = req.user._id;

      // Recherchez si cet utilisateur a favorisé cet événement
      const favourite = await Models.eventFavouriteUserModel.findOne({
        eventId,
        userId,
        favourite: 1,
      });

      if (favourite) {
        return res.status(200).json({ favourite: true });
      } else {
        return res.status(200).json({ favourite: false });
      }
    } catch (error) {
      console.error("Error checking if event is favourite:", error);
      return res.status(500).json({ message: error.message });
    }
  },
  attendEventByTickInFigma: async (req, res) => {
    try {
      let objToSave = {
        eventId: req.body.eventId,
        userId: req.user._id,
        attendEvent: 1,
      };

      let findGroup = {
        eventId: req.body.eventId,
      };
      var checkGroupHas = await Models.groupChatModel.findOne(findGroup);
      // Firstly, find if it exists, then delete; otherwise, create
      let findData = await Models.eventAttendesUserModel.findOne(objToSave);

      if (!findData) {
        let save = await Models.eventAttendesUserModel.create(objToSave);

        if (checkGroupHas) {
          const update = {
            $addToSet: {
              users: req.user._id, // Changed data.userId to req.user._id
            },
          };
          await Models.groupChatModel.findByIdAndUpdate(
            checkGroupHas._id,
            update,
            { new: true }, // This option returns the updated document
          );
        }
        return helper.success(
          res,
          "Event attendees confirmation sent successfully",
          save,
        );
      } else {
        let save = await Models.eventAttendesUserModel.deleteOne(objToSave);
        if (checkGroupHas) {
          await Models.groupChatModel.findByIdAndUpdate(
            checkGroupHas._id,
            { $pull: { users: req.user._id } }, // Changed data.userId to req.user._id
            { new: true },
          );
        }
        return helper.success(
          res,
          "Event attendees confirmation deleted successfully",
          save,
        );
      }
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  eventFavourite: async (req, res) => {
    try {
      let objToSave = {
        favourite: 1,
        eventId: req.body.eventId,
        userId: req.user._id,
      };
      //Firstly find if exist then delete other wise create
      let findData = await Models.eventFavouriteUserModel.findOne(objToSave);
      if (!findData) {
        let save = await Models.eventFavouriteUserModel.create(objToSave);
        return helper.success(res, "Event Favourite", save);
      } else {
        let save = await Models.eventFavouriteUserModel.deleteOne(objToSave);
        return helper.success(res, "Event not favourite", save);
      }
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },

  //Terms and condition
  CreatePrivacyPolicy: async (req, res) => {
    try {
      const existingDoc = await Models.cmsModel.findOne({
        title: "Privacy Policy",
      });
      if (existingDoc) {
        return res.status(409).json({
          message: "Document with title 'Privacy Policy' already exists",
        });
      }
      let objToSave = {
        title: "Privacy Policy",
        content: req.body.content,
      };
      let save = await Models.cmsModel.create(objToSave);
      return res
        .status(200)
        .json({ message: "Privacy Policy create  successfully", save: save });
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  getPrivacyPolicy: async (req, res) => {
    try {
      let result = await Models.cmsModel.findOne({ title: "Privacy Policy" });
      // return res.status(200).json({ message: 'Privacy Policy is',result:result });
      return helper.success(res, "Privacy Policy is", result);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  CreateTermAndCondition: async (req, res) => {
    try {
      const existingDoc = await Models.cmsModel.findOne({
        title: "Term and Condition",
      });
      if (existingDoc) {
        return res.status(409).json({
          message: "Document with title 'Term and Condition' already exists",
        });
      }
      let objToSave = {
        title: "Term and Condition",
        content: req.body.content,
      };
      let save = await Models.cmsModel.create(objToSave);
      return res.status(200).json({
        message: "Term and Condition create  successfully",
        save: save,
      });
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  getTermAndCondition: async (req, res) => {
    try {
      let result = await Models.cmsModel.findOne({
        title: "Term and Condition",
      });
      // return res.status(200).json({ message: 'Term and Condition is',result:result });
      return helper.success(res, "Term and Condition is", result);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  CreateAboutUs: async (req, res) => {
    try {
      const existingDoc = await Models.cmsModel.findOne({ title: "About Us" });
      if (existingDoc) {
        return res
          .status(409)
          .json({ message: "Document with title 'About Us' already exists" });
      }
      let objToSave = {
        title: "About Us",
        content: req.body.content,
      };
      let save = await Models.cmsModel.create(objToSave);
      return res
        .status(200)
        .json({ message: "About Us create  successfully", save: save });
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  getAboutUs: async (req, res) => {
    try {
      let result = await Models.cmsModel.findOne({ title: "About Us" });
      // return res.status(200).json({ message: 'About us is',result:result });
      return helper.success(res, "About us is", result);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  getCMS: async (req, res) => {
    try {
      let title;
      if (req.params.type == 1) {
        title = "Privacy Policy";
        message = "Privacy Policy is";
      } else if (req.params.type == 2) {
        title = "Term and Condition";
        message = "Term and Condition is";
      } else {
        title = "About Us";
        message = "About us is";
      }
      let result = await Models.cmsModel.findOne({ title });
      return helper.success(res, "List of cms", result);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },

  // FAQ
  addFAQ: async (req, res) => {
    try {
      let data = ({ question, answer } = req.body);
      let save = await Models.faqModel.create(data);
      return helper.success(res, "Save faq successfully", save);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  getFAQ: async (req, res) => {
    try {
      let data = await Models.faqModel.find();
      return helper.success(res, "List of FAQ ", data);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },

  //USER FOLLOW API'S
  userFollow: async (req, res) => {
    try {
      const v = new Validator(req.body, {
        followingId: "required",
      });
      let errorsResponse = await helper.checkValidation(v);
      if (errorsResponse) {
        return helper.failed(res, errorsResponse);
      }

      let data = {
        follower: req.user._id,
        following: req.body.followingId,
      };

      // Check if the entry already exists in the database
      let existingEntry = await Models.userFollowModel.findOne(data);
      if (existingEntry) {
        // Entry exists, so delete it
        let deletedEntry = await Models.userFollowModel.deleteMany(data);
        return helper.success(res, "Unfollow successfully", deletedEntry);
      } else {
        // Entry doesn't exist, so create it
        let createdEntry = await Models.userFollowModel.create(data);
        let user = await Models.userModel.findOne({
          _id: req.body.followingId,
        });
        let senderDetail = await Models.userModel.findOne({
          _id: req.user._id,
        });
        let deviceToken = user.deviceToken;
        let deviceType = user.deviceType;
        var senderNames = senderDetail.name
          ? senderDetail.name
          : senderDetail.firstName + senderDetail.lastName;
        let sendNotification = {
          senderId: req.user._id,
          senderName: senderDetail.name
            ? senderDetail.name
            : senderDetail.firstName + senderDetail.lastName,
          senderProfile: senderDetail.profileImage
            ? senderDetail.profileImage
            : senderDetail.image,
          reciverId: req.body.followingId,
          deviceType: deviceType,
          deviceToken: deviceToken,
          message: `${senderNames} started following you`,
        };
        let dataSave = {
          senderId: req.user._id,
          reciverId: req.body.followingId,
          message: `${senderNames} started following you`,
          is_read: 0,
        };
        await Models.followingNotificationModel.create(dataSave);
        if (deviceToken) {
          await helper.sendPushToIos(sendNotification);
        }
        return helper.success(res, "Follow successfully", createdEntry);
      }
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  followStatusForAllUsers: async (req, res) => {
    try {
      let loggedInUserId = null;
      if (req.user) {
        loggedInUserId = req.user._id;
        console.log("Logged in user ID:", loggedInUserId);
      }

      // Récupérer tous les utilisateurs, en populant les intérêts et en excluant l'utilisateur connecté s'il y a un utilisateur connecté
      const userList = await Models.userModel
        .find(
          loggedInUserId
            ? {
                $and: [
                  { _id: { $ne: loggedInUserId } },
                  { role: { $ne: "admin" } },
                ],
              }
            : { role: { $ne: "admin" } },
        )
        .populate("interest", "name _id"); // Populate interest field with name and _id

      console.log("User List:", userList.length); // Log pour vérifier le nombre d'utilisateurs trouvés

      let followingList = [];
      let followedByList = [];

      if (loggedInUserId) {
        // Récupérer la liste des utilisateurs suivis et qui suivent l'utilisateur connecté
        followingList = await Models.userFollowModel.find({
          follower: loggedInUserId,
        });
        followedByList = await Models.userFollowModel.find({
          following: loggedInUserId,
        });

        console.log("Following List:", followingList.length);
        console.log("Followed By List:", followedByList.length);
      }

      // Créer des maps pour un accès rapide
      const followingMap = new Map();
      followingList.forEach((following) => {
        followingMap.set(following.following.toString(), true);
      });

      const followedByMap = new Map();
      followedByList.forEach((followedBy) => {
        followedByMap.set(followedBy.follower.toString(), true);
      });

      // Préparer la liste des résultats avec seulement les champs nécessaires, incluant les intérêts
      const resultList = userList.map((user) => {
        const userId = user._id.toString();
        let status = "not-followed";

        if (loggedInUserId) {
          if (followingMap.has(userId) && followedByMap.has(userId)) {
            status = "follow-each-other";
          } else if (followingMap.has(userId)) {
            status = "following";
          } else if (followedByMap.has(userId)) {
            status = "followed";
          }
        }

        return {
          _id: user._id,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          status,
          interests: user.interest, // Inclure les intérêts ici
        };
      });

      console.log("Result List:", resultList.length); // Log pour vérifier le nombre d'utilisateurs dans le résultat final

      return helper.success(
        res,
        "List of users and their follow status",
        resultList,
      );
    } catch (error) {
      console.error("Error in followStatusForAllUsers controller: ", error);
      return res.status(500).json({ status: false, message: error.message });
    }
  },

  followStatusForAttendedUsers: async (req, res) => {
    try {
      // Find users who attended the event (attendEvent: "yes")
      const attendedUsers = await Models.RSVPSubmission.find({
        attendEvent: "yes",
        eventId: req.body.eventId,
        // eventId:"64df65b26135b146ec97453f"
      }).populate("userId");

      const loggedInUserId = req.user_id; // Assuming you have the logged-in user's ID
      // const loggedInUserId = "64e4816a1a599a5e9865d700";
      // Find users whom the logged-in user follows
      const followingList = await Models.userFollowModel.find({
        follower: loggedInUserId,
      });

      // Find users who follow the logged-in user
      const followedByList = await Models.userFollowModel.find({
        following: loggedInUserId,
      });

      // Create a map of following users for faster lookup
      const followingMap = new Map();
      followingList.forEach((following) => {
        followingMap.set(following.following.toString(), true);
      });

      // Create a map of followed by users for faster lookup
      const followedByMap = new Map();
      followedByList.forEach((followedBy) => {
        followedByMap.set(followedBy.follower.toString(), true);
      });

      // Prepare the result list with user details and follow status
      const resultList = attendedUsers.map((submission) => {
        const user = submission.userId;
        const userId = user._id.toString();
        let status = "not-followed";
        if (followingMap.has(userId) && followedByMap.has(userId)) {
          status = "follow-each-other";
        } else if (followingMap.has(userId)) {
          status = "following";
        } else if (followedByMap.has(userId)) {
          status = "followed";
        }
        return {
          user,
          status,
        };
      });

      return helper.success(
        res,
        "List of users who attended the event with follow status",
        resultList,
      );
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  followStatusForUsersYouFollow: async (req, res) => {
    console.log("****************************************************");
    try {
      let loggedInUserId = req.params.id;

      const userList = await Models.userModel.find({
        $and: [{ _id: { $ne: loggedInUserId } }, { role: { $ne: "admin" } }],
      });

      const followingList = await Models.userFollowModel.find({
        follower: loggedInUserId,
      });

      const followingMap = new Map();
      followingList.forEach((following) => {
        followingMap.set(following.following.toString(), true);
      });

      const resultList = userList.map((user) => {
        const userId = user._id.toString();
        let status = followingMap.has(userId) ? "following" : "not-followed";
        return {
          user,
          status,
        };
      });

      return helper.success(
        res,
        "List of users and their follow status based on who you follow",
        resultList,
      );
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  followStatusForAllUsersWithUserId: async (req, res) => {
    try {
      // const loggedInUserId = req.user._id;
      let loggedInUserId = req.params.id;
      const userList = await Models.userModel.find({
        $and: [{ _id: { $ne: loggedInUserId } }, { role: { $ne: "admin" } }],
      });

      const followingList = await Models.userFollowModel.find({
        follower: loggedInUserId,
      });
      const followedByList = await Models.userFollowModel.find({
        following: loggedInUserId,
      });

      const followingMap = new Map();
      followingList.forEach((following) => {
        followingMap.set(following.following.toString(), true);
      });

      const followedByMap = new Map();
      followedByList.forEach((followedBy) => {
        followedByMap.set(followedBy.follower.toString(), true);
      });

      const resultList = userList
        .map((user) => {
          const userId = user._id.toString();
          let status = "not-followed";
          if (followingMap.has(userId) && followedByMap.has(userId)) {
            status = "follow-each-other";
          } else if (followingMap.has(userId)) {
            status = "following";
          } else if (followedByMap.has(userId)) {
            status = "followed";
          }
          return {
            user,
            status,
          };
        })
        .filter(
          (result) =>
            result.status === "follow-each-other" ||
            result.status === "following",
        );

      return helper.success(
        res,
        "List of users and their follow status",
        resultList,
      );
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  followStatusForAllUsersWithUserIdSartaj: async (req, res) => {
    try {
      // const loggedInUserId = req.user._id;
      let loggedInUserId = req.params.id;
      const userList = await Models.userModel.find({
        $and: [{ _id: { $ne: loggedInUserId } }, { role: { $ne: "admin" } }],
      });

      const followingList = await Models.userFollowModel.find({
        follower: loggedInUserId,
      });
      const followedByList = await Models.userFollowModel.find({
        following: loggedInUserId,
      });

      const followingMap = new Map();
      followingList.forEach((following) => {
        followingMap.set(following.following.toString(), true);
      });

      const followedByMap = new Map();
      followedByList.forEach((followedBy) => {
        followedByMap.set(followedBy.follower.toString(), true);
      });

      const resultList = userList
        .map((user) => {
          const userId = user._id.toString();
          let status = "not-followed";
          if (followingMap.has(userId) && followedByMap.has(userId)) {
            status = "follow-each-other";
          } else if (followingMap.has(userId)) {
            status = "following";
          } else if (followedByMap.has(userId)) {
            status = "followed";
          }
          return {
            user,
            status,
          };
        })
        .filter(
          (result) =>
            result.status === "follow-each-other" ||
            result.status === "followed" ||
            result.status === "following" ||
            result.status == "not-followed",
        );

      return helper.success(
        res,
        "List of users and their follow status",
        resultList,
      );
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  getAllUpcomingPublicEvents: async (req, res) => {
    try {
      console.log("Start getting getAllUpcomingPublicEvents");
      const currentDate = new Date();

      // Récupération des événements publics à venir
      const events = await Event.find({
        eventType: "public",
        "details.date": { $gt: currentDate },
      })
        .populate({
          path: "user",
          select: "firstName lastName profileImage",
        })
        .populate({
          path: "coHosts",
          select: "firstName lastName profileImage",
        })
        .populate({
          path: "guests",
          select: "firstName lastName profileImage",
        })
        .populate({
          path: "interest", // Populate the interest field
          select: "name", // Select only the name of the interest
        })
        .exec();

      let enrichedEvents = events.map((event) => ({
        ...event.toObject(),
        isGoing: false, // Default to false
        isFavourite: false, // Default to false
      }));

      if (req.user) {
        // Récupération des participations de l'utilisateur connecté
        const attendeeStatus = await EventAttendee.find({
          userId: req.user._id,
          eventId: { $in: events.map((event) => event._id) },
        }).exec();

        const favoriteStatus = await EventFavorite.find({
          userId: req.user._id,
          eventId: { $in: events.map((event) => event._id) },
        }).exec();

        const goingStatusMap = {};
        attendeeStatus.forEach((status) => {
          goingStatusMap[status.eventId] = status.attendEvent === 1;
        });

        const favouriteStatusMap = {};
        favoriteStatus.forEach((status) => {
          favouriteStatusMap[status.eventId] = status.favourite === 1;
        });

        enrichedEvents = events.map((event) => {
          const isGoing = !!goingStatusMap[event._id];
          const isFavourite = !!favouriteStatusMap[event._id];
          return {
            ...event.toObject(),
            isGoing,
            isFavourite,
          };
        });
      }

      // Enveloppe de la réponse avec des métadonnées
      res.status(200).json({
        success: true,
        message: "Upcoming public events retrieved successfully",
        data: enrichedEvents,
      });
    } catch (error) {
      console.error("Error in getAllUpcomingPublicEvents controller: ", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve upcoming public events",
        error: error.message,
      });
    }
  },

  //Socket messages
  saveMessage: async (req, res) => {
    try {
      let checkChatConstant = await Models.chatconstant.findOne({
        $or: [
          { senderId: req.body.senderId, reciverId: req.body.reciverId },
          { senderId: req.body.reciverId, reciverId: req.body.senderId },
        ],
      });
      let messages;
      if (req.body.message_type == 1) {
        messages = req.body.message;
      } else if (req.body.message_type == 3) {
        if (req.files && req.files.video) {
          const video = req.files.video;
          messages = await helper.fileUpload(video, "videos");

          await new Promise((resolve, reject) => {
            ffmpeg(`${process.cwd()}/public/images/videos/${messages}`)
              .screenshots({
                timestamps: ["05%"],
                filename: `${messages}thumbnail.jpg`,
                folder: `${process.cwd()}/public/images/videos/`,
                size: "320x240",
              })
              .on("end", () => {
                resolve();
              })
              .on("error", (err) => {
                reject(err);
              });
          });
          var thumbnail = `${messages}thumbnail.jpg`;
        }
      } else if (req.body.message_type == 2) {
        if (req.files && req.files.images) {
          messages = await helper.fileUpload(image, "profile");
        }
      }

      if (checkChatConstant) {
        let saveMsg = await Models.message.create({
          senderId: req.body.senderId,
          reciverId: req.body.reciverId,
          message: messages,
          message_type: req.body.message_type,
          constantId: checkChatConstant.id,
        });

        await Models.chatconstant.updateOne(
          { _id: checkChatConstant._id },
          { lastmessage: saveMsg._id },
        );

        let getMsg = await Models.message
          .findOne({
            senderId: saveMsg.senderId,
            reciverId: saveMsg.reciverId,
            _id: saveMsg._id,
          })
          .populate([
            {
              path: "senderId",
              select: "id name profileImage",
            },
            {
              path: "reciverId",
              select: "id name profileImage",
            },
          ]);
        socket.emit("send_message_emit", getMsg);
      } else {
        let createChatConstant = await Models.chatconstant.create({
          senderId: req.body.senderId,
          reciverId: req.body.reciverId,
        });

        let saveMsg = await Models.message.create({
          senderId: req.body.senderID,
          reciverId: req.body.receiverID,
          message: messages,
          message_type: req.body.message_type,
          constantId: createChatConstant._id,
        });

        await Models.chatconstant.updateOne(
          { _id: createChatConstant._id },
          { lastmessage: saveMsg._id },
        );

        let getMsg = await Models.message
          .findOne({
            senderId: saveMsg.senderId,
            reciverId: saveMsg.reciverId,
            _id: saveMsg._id,
          })
          .populate([
            {
              path: "senderId",
              select: "id name profileImage",
            },
            {
              path: "reciverId",
              select: "id name profileImage",
            },
          ]);
        socket.emit("send_message_emit", getMsg);
      }
    } catch (error) {
      console.error(error);
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  reportUser: async (req, res) => {
    try {
      let objToSave = {
        senderID: req.body.senderID,
        reciverId: req.body.reciverId,
        message: req.body.message,
      };
      let saveData = await Models.ReportModel.create(objToSave);
      socket.emit("report_message_emit", saveData);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  blockUser: async (req, res) => {
    try {
      let criteria = {
        senderID: req.body.senderID,
        reciverId: req.body.reciverId,
      };
      let objToUpdate = {
        is_block: 1,
      };
      let block = await Models.chatconstant.findOneAndUpdate(
        criteria,
        objToUpdate,
      );
      socket.emit("block_user_emit", block);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  onWholeApplicationSearch: async (req, res) => {
    try {
      const { search } = req.query;
      const regexSearch = search ? { $regex: search, $options: "i" } : "";

      const userQuery = {
        $or: [
          { name: regexSearch },
          { email: regexSearch },
          { role: regexSearch },
          { phoneNumber: regexSearch },
          { firstName: regexSearch },
          { lastName: regexSearch },
          { phone: regexSearch },
        ],
      };

      const eventQuery = {
        $or: [{ eventType: regexSearch }, { "details.name": regexSearch }],
      };

      const faqQuery = {
        $or: [{ question: regexSearch }, { answer: regexSearch }],
      };
      const rsvpQuestionQuery = {
        "rsvpAnswers.question": regexSearch,
      };

      const rsvpAnswerQuery = {
        "rsvpAnswers.answer": regexSearch,
      };
      const rsvpSubmissionAnswer = {
        $or: [
          { attendEvent: regexSearch },
          { name: regexSearch },
          { email: regexSearch },
          { phoneNumber: regexSearch },
          { firstName: regexSearch },
          { lastName: regexSearch },
          rsvpQuestionQuery,
          rsvpAnswerQuery,
        ],
      };
      const contactUsQuery = {
        $or: [
          { name: regexSearch },
          { email: regexSearch },
          { phoneNumber: regexSearch },
          { message: regexSearch },
        ],
      };
      const interestQuery = {
        name: regexSearch,
      };
      const [
        userResults,
        eventResults,
        faqResults,
        rsvpSubmissionAnswerResult,
        contactUsResult,
        interestResult,
      ] = await Promise.all([
        Models.userModel.find(search ? userQuery : {}),
        Models.eventModel.find(search ? eventQuery : {}),
        Models.faqModel.find(search ? faqQuery : {}),
        Models.RSVPSubmission.find(search ? rsvpSubmissionAnswer : {}),
        Models.contactUsModel.find(search ? contactUsQuery : {}),
        Models.interestModel.find(search ? interestQuery : {}),
      ]);

      const result = {
        users: userResults,
        events: eventResults,
        faqs: faqResults,
        rsvpSub: rsvpSubmissionAnswerResult,
        contactUs: contactUsResult,
        interest: interestResult,
      };

      return helper.success(res, "List of search", result);
    } catch (error) {
      return res
        .status(500)
        .json({ status: false, message: "Internal Server Error" });
    }
  },

  //Notification
  FollowReciverNotification: async (req, res) => {
    try {
      let respone = await Models.followingNotificationModel.find({
        reciverId: req.user._id,
      });
      return helper.success(res, "List of Following notifications ", respone);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  FollowerReciverNotificatonRead: async (req, res) => {
    try {
      let criteria = {
        _id: req.body._id,
      };
      let objToUpdate = {
        is_read: 1,
      };
      let save = await Models.followingNotificationModel.updateOne(
        criteria,
        objToUpdate,
      );
      return helper.success(
        res,
        "Following notification read status change",
        save,
      );
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  eventNotificationList: async (req, res) => {
    try {
      let respone = await Models.eventNotificationModel.find({
        reciverId: req.user._id,
      });
      return helper.success(res, "List of event notification ", respone);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  eventNotificatonRead: async (req, res) => {
    try {
      let criteria = {
        _id: req.body._id,
      };
      let objToUpdate = {
        is_read: 1,
      };
      let save = await Models.eventNotificationModel.updateOne(
        criteria,
        objToUpdate,
      );
      return helper.success(res, "Event notification read status change", save);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  clearNotification: async (req, res) => {
    try {
      await Models.eventNotificationModel.deleteMany({
        reciverId: req.user._id,
      });
      await Models.followingNotificationModel.deleteMany({
        reciverId: req.user._id,
      });
      return helper.success(res, "Notitication clear successfully");
    } catch (error) {
      throw error;
    }
  },
  notificationList: async (req, res) => {
    try {
      // let eventNotifcation=await Models.eventNotificationModel.find({reciverId:req.user._id})
      const loginUserId = req.user._id; // The ID of the logged-in user

      // Fetch all RSVP form submissions for the logged-in user
      const rsvpSubmissions = await Models.RSVPSubmission.find({
        userId: loginUserId,
      });
      // Create a Set to store unique event IDs for which the user has submitted RSVP forms
      const rsvpEventIds = new Set();
      rsvpSubmissions.forEach((submission) => {
        rsvpEventIds.add(submission.eventId.toString()); // Add the eventId to the Set
      });

      // Fetch event notifications for the logged-in user
      const eventNotifications = await Models.eventNotificationModel.find({
        reciverId: loginUserId,
      });

      // console.log("eventNotifications",eventNotifications)
      // Update event notifications with the rsvpForm property
      const notificationsWithRSVP = await Promise.all(
        eventNotifications.map(async (notification) => {
          let event = await Models.eventModel.findOne({
            _id: notification.eventId.toString(),
          });
          // console.log("object",event)
          let ID = req.user._id.toString();
          let coHostStatus = false;
          const coHostIds = event.coHosts.map((coHost) => coHost.toString());
          if (coHostIds.includes(ID)) {
            coHostStatus = coHostIds.includes(ID);
          }
          const eventIdStr = notification.eventId.toString();
          const hasRSVP = rsvpEventIds.has(eventIdStr);
          return {
            ...notification.toObject(),
            rsvpForm: hasRSVP, // Set rsvpForm to true if there is an RSVP submission, false otherwise
            coHostStatus: coHostStatus,
          };
        }),
      );
      console.log("notificationsWithRSVP", notificationsWithRSVP);
      let followingNotification = await Models.followingNotificationModel.find({
        reciverId: req.user._id,
      });
      let obj = {
        eventNotifcation: notificationsWithRSVP,
        followingNotification: followingNotification,
      };
      return helper.success(res, "List of notification ", obj);
    } catch (error) {
      return res.status(401).json({ status: false, message: error.message });
    }
  },
  deleteData: async (req, res) => {
    try {
      //  await Models.RSVPSubmission.deleteMany({});
      //  await Models.EventPhotoVideosModel.deleteMany({})
      //  await Models.eventAttendesUserModel.deleteMany({})
      //  await Models.ReportModel.deleteMany({});
      await Models.chatconstant.deleteMany({});
      await Models.message.deleteMany({});
      //  await Models.eventModel.deleteMany({});
      //  await Models.coHostModel.deleteMany({})
      //  await Models.followingNotificationModel.deleteMany({});
      //  await Models.userFollowModel.deleteMany({})
      //  await Models.groupChatModel.deleteMany({})
      //  await Models.eventFavouriteUserModel.deleteMany({})
      //  await Models.contactUsModel.deleteMany({})
      // await Models.eventNotificationModel.deleteMany({})
    } catch (error) {}
  },
  test: async (req, res) => {
    try {
      //  let list=await Models.userModel.aggregate([
      //   {
      //     $match:{role:"user"}
      //   },
      //   {
      //     $lookup: {
      //       from: "events",
      //       localField: "_id",
      //       foreignField: "user",
      //       as: "user_event_create_list",
      //     },
      //   },
      //   {
      //     $project: {
      //       "name": 1,
      //       "email":1,
      //       "role":1,
      //       "user_event_create_list":1
      //     }
      //   },
      //  ])
      // await Models.followingNotificationModel.updateMany({},{$set:{isBirthday:0}})
      //   await Models.followingNotificationModel.updateMany(
      //     { message: { $regex: /birthday today!/ } }, // Using $regex to match the message
      //     { $set: { isBirthday: 1 } } // Setting isBirthday to 1 for matching documents
      // );
      // const startOfNextDay = moment().add(1, 'day').startOf('day');

      // const pastEvents = await Models.eventModel.find({
      //   "details.date": { $gte: startOfNextDay.toDate() }
      // });
      // await Models.eventModel.updateMany({},{$set:{coHostStatus:false}})
      // const pastEvents = await Models.eventModel.find({
      // });
      // let eventIds=pastEvents.map((event)=>event._id);
      // let strArray = eventIds.map(id => id.toString());
      // let attendEvent = await Models.eventAttendesUserModel.find({ eventId: { $in: strArray } });
      // let favouriteEvent=await Models.eventFavouriteUserModel.find({ eventId: { $in: strArray } })
      // let attendEventUserId=attendEvent.map((a)=>a.userId)
      // let favouriteEventUserId=favouriteEvent.map((f)=>f.userId)

      // let userIds=pastEvents.map((e)=>e.user)
      // let userIdsCoHost=pastEvents.map((events)=>events.coHosts)
      // userIdsCoHost=userIdsCoHost.flat()
      // let userIdsGuest=pastEvents.map((ev)=>ev.guests)
      // userIdsGuest=userIdsGuest.flat()

      // let combinedArray = [...userIds,...eventIds, ...userIdsCoHost, ...userIdsGuest,...attendEventUserId,...favouriteEventUserId];
      // console.log("cmbinde",combinedArray)
      // let combinedArrays=combinedArray.map((e)=>e.toString())
      // let uniqueResult = [...new Set(combinedArrays)];
      //    return helper.success(res, 'List of user_event_create_list ',uniqueResult );

      // const pastEvents = await Models.eventModel.find({});
      // const eventIds = pastEvents.map(event => event._id.toString());

      // const attendEvent = await Models.eventAttendesUserModel.find({ eventId: { $in: eventIds } });
      // const favouriteEvent = await Models.eventFavouriteUserModel.find({ eventId: { $in: eventIds } });

      // const attendEventUserId = attendEvent.map(a => a.userId.toString());
      // const favouriteEventUserId = favouriteEvent.map(f => f.userId.toString());

      // const userIds = pastEvents.map(e => e.user.toString());
      // const userIdsCoHost = pastEvents.reduce((acc, event) => acc.concat(event.coHosts.map(c => c.toString())), []);
      // const userIdsGuest = pastEvents.reduce((acc, event) => acc.concat(event.guests.map(g => g.toString())), []);

      // const combinedArray = [...userIds, ...eventIds, ...userIdsCoHost, ...userIdsGuest, ...attendEventUserId, ...favouriteEventUserId];
      // const uniqueResult = [...new Set(combinedArray)];
      //   let uniqueResult=[];
      //   let attendEventUserId=[];
      //   let favouriteEventUserId=[];
      //   const pastEvents = await Models.eventModel.find({});
      // for (const eventIds of pastEvents){
      //   console.log("eventDetail----",eventIds.details.name)
      //   console.log("eventDetail----",eventIds.details.startTime)

      //   const attendEvent = await Models.eventAttendesUserModel.find({ eventId: eventIds._id.toString() });
      //   let favouriteEvent = await Models.eventFavouriteUserModel.find({ eventId: eventIds._id.toString() });
      //   if(attendEvent&&attendEvent.length>0){
      //      attendEventUserId = attendEvent.map(a => a.userId.toString());
      //   }
      //   if(favouriteEvent&&favouriteEvent.length>0){
      //     favouriteEventUserId = favouriteEvent.map(f => f.userId.toString());
      //   }
      //   let userIds = [];
      //   userIds.push(eventIds.user.toString())
      //   const userIdsCoHost = eventIds.coHosts.map((e)=>e.toString());
      //   const userIdsGuest = eventIds.guests.map((e)=>e.toString());
      //   let combinedArray = [...userIds, ...userIdsCoHost, ...userIdsGuest, ...attendEventUserId, ...favouriteEventUserId];
      //   uniqueResult.push(...combinedArray);
      //  }
      // let objToSave={
      //   deviceToken:"0be6b1842ebd885510824a9589a901da9c0d070656b69b2380499facbea0bfb1"
      // }
      // helper.sendPushToIosForEvent(objToSave)

      // await Models.eventModel.deleteMany({})
      // await Models.eventAttendesUserModel.deleteMany({})
      // await Models.eventFavouriteUserModel.deleteMany({})
      return helper.success(
        res,
        "List of user_event_create_list",
        uniqueResult,
      );
    } catch (error) {
      throw error;
    }
  },
};
