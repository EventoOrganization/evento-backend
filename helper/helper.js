var apn = require("apn");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
// var ffmpeg = require("fluent-ffmpeg");
// const schedule = require("node-schedule");
// ffmpeg.setFfprobePath("../public/images/videos");
// Configuration du client S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports = {
  scheduler: function (data) {
    console.log(data, "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDdd");
    try {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    } catch (error) {
      console.log(error);
    }
  },
  success: function (res, message = "", body = {}) {
    return res.status(200).json({
      success: true,
      code: 200,
      message: message,
      body: body,
    });
  },

  error: function (res, err, req) {
    console.log(err, "===========================>error");
    let code = typeof err === "object" ? (err.code ? err.code : 403) : 403;
    let message =
      typeof err === "object" ? (err.message ? err.message : "") : err;

    if (req) {
      req.flash("flashMessage", {
        color: "error",
        message,
      });

      const originalUrl = req.originalUrl.split("/")[1];
      return res.redirect(`/${originalUrl}`);
    }

    return res.status(code).json({
      success: false,
      message: message,
      code: code,
      body: {},
    });
  },

  failed: function (res, message = "") {
    message =
      typeof message === "object"
        ? message.message
          ? message.message
          : ""
        : message;
    return res.status(400).json({
      success: false,
      code: 400,
      message: message,
      body: {},
    });
  },

  unixTimestamp: function () {
    var time = Date.now();
    var n = time / 1000;
    return (time = Math.floor(n));
  },

  checkValidation: async (v) => {
    var errorsResponse;

    await v.check().then(function (matched) {
      if (!matched) {
        var valdErrors = v.errors;
        var respErrors = [];
        Object.keys(valdErrors).forEach(function (key) {
          if (valdErrors && valdErrors[key] && valdErrors[key].message) {
            respErrors.push(valdErrors[key].message);
          }
        });
        errorsResponse = respErrors.join(", ");
      }
    });
    return errorsResponse;
  },
  //This is push notificatoin for follwing status
  sendPushToIos: async function (notification_data) {
    console.log("SendPushToIOS In helper----------->>", notification_data);
    try {
      var options = {
        to: notification_data.deviceToken,
        token: {
          key: __dirname + "/AuthKey_C39J4VR3G3.p8",
          keyId: "C39J4VR3G3",
          teamId: "2XY788382M",
        },
        production: true,
      };
      // budle Id:  com.live.EventoAPP

      let notification = {
        message: notification_data.message,
        type: notification_data.deviceType == "IOS" ? 1 : 2,
        senderId: notification_data.senderId,
        senderName: notification_data.senderName,
        senderProfile: notification_data.senderProfile,
        reciverId: notification_data.reciverId,
        message_type: notification_data.message_type,
        notificationType: notification_data.notificationType
          ? notification_data.notificationType
          : 2,
      };
      var apnProvider = new apn.Provider(options);
      var note = new apn.Notification();

      note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
      note.badge = 3;
      note.sound = "ping.aiff";
      note.alert = notification_data.message;
      note.aps.alert = notification_data.message;
      note.payload = { body: notification };
      note.topic = "com.live.EventoAPP";
      (note.senderId = notification_data.senderId),
        (note.reciverId = notification_data.reciverId),
        (note.message_type = notification_data.message_type);
      console.log(note, "---note--");
      const status = await apnProvider.send(
        note,
        notification_data.deviceToken,
      );
      console.log("status", status);
      return status;
    } catch (error) {
      console.log("Inside catch in send push to IOS in helper--->", error);
    }
  },
  //this is notification for send detail of push notitication
  sendPushToIosForEvent: async function (notification_data) {
    console.log(
      "sendPushToIosForEvent In helper----------->>",
      notification_data,
    );
    try {
      const deviceTokens = Array.isArray(notification_data.deviceToken)
        ? notification_data.deviceToken
        : [notification_data.deviceToken];

      const receiverIds = Array.isArray(notification_data.receiverId)
        ? notification_data.receiverId
        : [notification_data.receiverId];

      for (let i = 0; i < deviceTokens.length; i++) {
        const deviceToken = deviceTokens[i];
        const receiverId = receiverIds[i];

        let notification = {
          message: notification_data.message,
          eventId: notification_data.eventId,
          senderId: notification_data.senderId,
          senderName: notification_data.senderName,
          senderProfile: notification_data.senderImage,
          receiverId: receiverId,
          notificationType: 3,
        };

        if (notification_data.deviceType === "IOS") {
          // iOS Notification
          const note = new apn.Notification();
          note.expiry = Math.floor(Date.now() / 1000) + 3600;
          note.badge = 3;
          note.sound = "ping.aiff";
          note.alert = notification_data.message;
          note.payload = { body: notification };
          note.topic = "com.live.EventoAPP";
          note.senderId = notification_data.senderId;
          note.receiverId = receiverId;

          var apnProvider = new apn.Provider({
            token: {
              key: __dirname + "/AuthKey_C39J4VR3G3.p8",
              keyId: "C39J4VR3G3",
              teamId: "2XY788382M",
            },
            production: true,
          });

          const status = await apnProvider.send(note, deviceToken);
          console.log("status", status);

          apnProvider.shutdown(); // Close the APN provider
        } else if (notification_data.deviceType === "WEB") {
          // Web Notification
          const webNotificationData = {
            title: "Evento Notification",
            body: notification_data.message,
            icon: notification_data.senderImage,
            url: `https://yourwebsite.com/event/${notification_data.eventId}`,
          };

          // Here you need to call your method to send web notification
          // Example: await sendWebNotification(receiverId, webNotificationData);
          console.log("Web notification data", webNotificationData);
        } else if (notification_data.deviceType === "ANDROID") {
          // Android Notification
          const androidNotificationData = {
            title: "Evento Notification",
            body: notification_data.message,
            data: {
              eventId: notification_data.eventId,
              senderId: notification_data.senderId,
            },
          };

          // Call a method to send the FCM notification
          // Example: await sendAndroidNotification(deviceToken, androidNotificationData);
          console.log("Android notification data", androidNotificationData);
        } else {
          console.log("Unhandled device type:", notification_data.deviceType);
        }
      }

      return true;
    } catch (error) {
      console.log("Error in sending notifications", error);
      return false;
    }
  },

  //This is push notificatoin for chat message
  sendPushToIosChat: async function (notification_data) {
    console.log("sendPushToIosChat In helper----------->>", notification_data);
    try {
      var options = {
        to: notification_data.deviceToken,
        token: {
          key: __dirname + "/AuthKey_C39J4VR3G3.p8",
          keyId: "C39J4VR3G3",
          teamId: "2XY788382M",
        },
        production: true,
      };
      // budle Id:  com.live.EventoAPP

      let notification = {
        message: notification_data.getMsg
          ? notification_data.getMsg.message
          : "",
        type: notification_data.deviceType == "IOS" ? 1 : 2,
        chatType: notification_data.chatType,
        senderDetail: notification_data.getMsg
          ? notification_data.getMsg.senderId
          : "",
        reciverDetail: notification_data.getMsg
          ? notification_data.getMsg.reciverId
          : "",
        groupUserIds: notification_data.getMsg
          ? notification_data.getMsg.groupUserIds
          : "",
        message_type: notification_data.getMsg
          ? notification_data.getMsg.message_type
          : "",
        groupDetail: notification_data.getGroupDetail
          ? notification_data.getGroupDetail
          : "",
        notificationType: 1,
      };
      var apnProvider = new apn.Provider(options);
      var note = new apn.Notification();

      note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
      note.badge = 3;
      note.sound = "ping.aiff";
      note.alert = notification_data.getMsg
        ? notification_data.getMsg.message
        : "";
      note.aps.alert = notification_data.getMsg
        ? notification_data.getMsg.message
        : "";
      note.payload = { body: notification };
      note.topic = "com.live.EventoAPP";
      (note.senderDetail = notification_data.getMsg.senderId),
        (note.senderId = notification_data.getMsg.senderId._id),
        (note.senderName = notification_data.getMsg.senderId.name),
        (note.reciverId = notification_data.getMsg.reciverId
          ? notification_data.getMsg.reciverId._id
          : ""),
        (groupUserIds = notification_data.getMsg
          ? notification_data.getMsg.groupUserIds
          : ""),
        (note.message_type = notification_data.getMsg.message_type);
      console.log(note, "---note--");
      const status = await apnProvider.send(
        note,
        notification_data.deviceToken,
      );
      console.log("status", status);
      return status;
    } catch (error) {
      console.log("Inside catch in send push to IOS in helper--->", error);
    }
  },

  async fileUpload(file, folder = "users") {
    console.log(file, "===================================##@@");

    let file_name_string = file.name;
    var file_name_array = file_name_string.split(".");

    var file_ext = file_name_array[file_name_array.length - 1];

    var letters = "ABCDE1234567890FGHJK1234567890MNPQRSTUXY";
    var result = "";
    while (result.length < 28) {
      var rand_int = Math.floor(Math.random() * 19 + 1);
      var rand_chr = letters[rand_int];
      if (result.substr(-1, 1) != rand_chr) result += rand_chr;
    }
    console.log("result====>", result);
    var resultExt = `${result}.${file_ext}`;

    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `${folder}/${resultExt}`,
      Body: file.data,
      ContentType: file.mimetype,
    };

    try {
      const s3Result = await s3.send(new PutObjectCommand(uploadParams));
      console.log("s3Result", s3Result);

      return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${folder}/${resultExt}`;
    } catch (error) {
      console.log("Error uploading to S3:", error);
      throw new Error("S3 upload failed");
    }
  },

  //   uploadThumbAndVideo: async (file, folder = "users") => {
  //     const videoName = file.name;
  //     console.log("🚀 ~ videoName:", videoName);
  //     const fileExt = videoName.split(".").pop(); // Extract file extension

  //     // Generate a random name for the thumbnail
  //     const letters = "ABCDE1234567890FGHJK1234567890MNPQRSTUXY";
  //     let thumbnailName = "";
  //     while (thumbnailName.length < 28) {
  //       const randIndex = Math.floor(Math.random() * letters.length);
  //       thumbnailName += letters[randIndex];
  //     }
  //     const thumbnailExt = "jpg"; // Customize the thumbnail extension if needed
  //     const thumbnailFullName = `${thumbnailName}.${thumbnailExt}`;

  //     console.log("🚀 ~ thumbnailFullName:", thumbnailFullName);

  //     // Move the video file to the specified folder
  //     await file.mv(`public/images/${folder}/${videoName}`);

  //     // Create a promise to handle the ffmpeg function
  //     return new Promise((resolve, reject) => {
  //       ffmpeg(`public/images/${folder}/${videoName}`)
  //         .screenshots({
  //           timestamps: ["05%"],
  //           filename: thumbnailFullName,
  //           folder: `public/images/${folder}`,
  //           size: "320x240",
  //         })
  //         .on("end", (result) => {
  //           console.log("🚀 ~ file: helper.js:141 ~ .on ~ result:", result);
  //           resolve({ videoName, thumbnail: thumbnailFullName });
  //           return { videoName, thumbnail: thumbnailFullName };
  //         })
  //         .on("error", (err) => {
  //           reject(err);
  //         });
  //     });
  //   },

  //   send_push_notification: async (
  //     get_message,
  //     device_token,
  //     device_type,
  //     target_id,
  //     target_name,
  //     sender_image,
  //     noti_type
  //   ) => {
  //     console.log("hello test", device_token);

  //     //    var device_token=`cD44-Lx8SGGaCLh-g5td4R:APA91bGFtyxdnY_ZrR-ZE0lv_Urz7Y0G-ZwL2ZzjohOM684e4kDO73UWSF2gtRxKM2PnlrEbtMimEFBg2m8Lnox6-TWEI3oQ_6vdTHM1IEKFCPaDJbzmcf7auPuyVUOJ2sJJSfM_aezA`
  //     if (device_type == 0) {
  //       if (device_token != "") {
  //         var new_message = {
  //           to: device_token,
  //           data: {
  //             title: "Power Edge",
  //             message: get_message,
  //             device_token: device_token,
  //             device_type: device_type,
  //             notification_code: noti_type,
  //             sender_id: target_id,
  //             sender_name: target_name,
  //             sender_image: sender_image,
  //           },
  //           notification: {
  //             message: get_message,
  //           },
  //         };

  //         var serverKey =
  //           "AAAAmgsBFRE:APA91bGYZtCiLLrZsgxZnhg9ioDF0yeSYhAXL3NqSyx1JUjmKqGPH6uXwaqkgR7sOhdz5JEt54kKNzY9lVudll9GMC_BNm173DHnDIdJDmZzxwT5BMv7Z66VN9BA-pXhlXN4dgM9Qy5-";

  //         var fcm = new FCM(serverKey);
  //         fcm.send(new_message, function (err, response) {
  //           if (err) {
  //             console.log("Something has gone wrong!");
  //             console.log(err, "new_message");
  //           } else {
  //             console.log(new_message, "new_message");
  //             console.log("Successfully sent with response: ", response);
  //           }
  //         });
  //       }
  //     }
  //   },

  //   sendNotificationApn: async (data) => {
  //     try {
  //       var note = new apn.Notification();

  //       note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
  //       note.badge = 3;
  //       note.sound = "ping.aiff";
  //       note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
  //       note.payload = { messageFrom: "John Appleseed" };
  //       note.topic = "<your-app-bundle-id>";
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   },
};
