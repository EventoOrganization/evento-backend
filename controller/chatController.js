const Models = require("../models");
const helper = require("../helper/helper");
const moment = require("moment");
exports.myEventsWithChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const events = await Models.eventModel
      .find({
        $or: [
          { user: userId },
          { coHosts: { $in: [userId] } },
          { guests: { $in: [userId] } },
          { attendees: { $in: [userId] } },
        ],
        "details.includeChat": true,
      })
      .populate("user", "firstName lastName username profileImage")
      .lean(); // Ajouter .lean() pour manipuler les objets retournés

    // Ajouter le rôle de l'utilisateur à chaque événement
    const eventsWithRole = events.map((event) => {
      let role = "Participant";
      if (event.user._id.equals(userId)) {
        role = "Host";
      } else if (event.coHosts.includes(userId)) {
        role = "Co-Host";
      } else if (event.guests.includes(userId)) {
        role = "Guest";
      } else if (event.attendees.includes(userId)) {
        role = "Attendee";
      }

      return {
        ...event,
        userRole: role,
      };
    });

    return res.status(200).json({ status: true, events: eventsWithRole });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
exports.privateConversations = async (req, res) => {
  try {
    const userId = req.user._id; // Utilisateur connecté

    // Récupérer toutes les conversations où l'utilisateur est soit sender soit receiver
    const conversations = await Models.chatconstant
      .find({
        $or: [{ senderId: userId }, { reciverId: userId }],
      })
      .populate("senderId", "id username firstName lastName profileImage") // Peupler le sender
      .populate("reciverId", "id username firstName lastName profileImage") // Peupler le receiver
      .populate("lastmessage"); // Peupler le dernier message

    return res.status(200).json({
      status: true,
      conversations,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

exports.saveMessage = async (req, res) => {
  console.log("req.body", req.body);
  try {
    const { eventId, receiverId, senderId, message, message_type } = req.body;
    let messages;

    // Vérifier si c'est un message texte, image ou vidéo
    if (message_type == 1) {
      messages = message;
    } else if (message_type == 2 && req.files && req.files.images) {
      const image = req.files.images;
      messages = await helper.fileUploadLarge(
        image,
        "/events/" + eventId + "/chat/images",
      );
    } else if (message_type == 3 && req.files && req.files.video) {
      const video = req.files.video;
      messages = await helper.fileUploadLarge(
        video,
        `/events/${eventId}/chat/videos`,
      );
    } else {
      return res.status(400).json({
        status: false,
        message: "Invalid message type or missing file",
      });
    }

    // Vérification si c'est une conversation de groupe ou privée
    let chatConstant, saveMsg;

    if (eventId) {
      // Gestion des messages de groupe
      chatConstant = await Models.chatconstant.findOne({ groupId: eventId });

      if (!chatConstant) {
        chatConstant = await Models.chatconstant.create({
          senderId,
          groupUserIds: [], // Optionnel : ajouter les utilisateurs du groupe si besoin
          groupId: eventId,
        });
      }

      saveMsg = await Models.message.create({
        senderId,
        groupUserIds: [], // Optionnel : ajouter les utilisateurs du groupe
        message: messages,
        message_type,
        constantId: chatConstant._id,
        groupId: eventId,
        date: moment().format("YYYY-MM-DD"),
        time: moment().format("LT"),
      });

      // Mettre à jour le dernier message dans le chat de groupe
      await Models.chatconstant.updateOne(
        { _id: chatConstant._id },
        { lastmessage: saveMsg._id },
      );
    } else if (receiverId) {
      // Gestion des messages privés
      chatConstant = await Models.chatconstant.findOne({
        $or: [
          { senderId, reciverId: receiverId },
          { senderId: receiverId, reciverId: senderId },
        ],
      });

      if (!chatConstant) {
        chatConstant = await Models.chatconstant.create({
          senderId,
          reciverId: receiverId,
        });
      }

      saveMsg = await Models.message.create({
        senderId,
        reciverId: receiverId,
        message: messages,
        message_type,
        constantId: chatConstant._id,
        date: moment().format("YYYY-MM-DD"),
        time: moment().format("LT"),
      });

      // Mettre à jour le dernier message dans la conversation privée
      await Models.chatconstant.updateOne(
        { _id: chatConstant._id },
        { lastmessage: saveMsg._id },
      );
    } else {
      return res.status(400).json({
        status: false,
        message: "Either eventId or receiverId must be provided",
      });
    }

    // Récupérer le message avec les informations du sender et du receiver (ou du groupe)
    const getMsg = await Models.message.findOne({ _id: saveMsg._id }).populate([
      { path: "senderId", select: "id name profileImage" },
      { path: "reciverId", select: "id name profileImage" },
      { path: "groupId", select: "id groupName image" },
    ]);

    // Émettre le message via le socket
    socket.emit("send_message_emit", getMsg);

    return res.status(200).json({
      status: true,
      message: "Message sent successfully",
      data: getMsg,
    });
  } catch (error) {
    console.error("Error saving message:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};
