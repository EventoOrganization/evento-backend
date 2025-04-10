const Models = require("../models");
const socket = require("socket.io");
const { sendNotification } = require("../helper/pwaNotificationPush");

exports.sendMessage = async (req, res) => {
  const { message, senderId, conversationId, messageType } = req.body;

  if (!message || !senderId || !conversationId || !messageType) {
    return res.status(400).json({
      status: false,
      message:
        "❌ ~ Missing required fields (message, senderId, conversationId).",
    });
  }

  try {
    const conversation = await Models.chatconstant
      .findById(conversationId)
      .populate("members");

    if (!conversation) {
      return res.status(404).json({
        status: false,
        message: "Conversation not found.",
      });
    }

    const newMessage = new Models.message({
      senderId,
      reciverId: conversation.targetId,
      constantId: conversationId,
      message,
      message_type: messageType,
    });

    await newMessage.save();

    const populatedMessage = await Models.message
      .findById(newMessage._id)
      .populate("senderId", "username profileImage");

    // Emit the message via socket to the entire group
    if (req.io) {
      req.io.to(conversationId).emit("send_message_emit", populatedMessage);
    } else {
      console.error("❌ ~ Socket.io instance not found on req object.");
    }

    // Notification Push
    const members = conversation.members;

    if (members && members.length > 0) {
      const payload = JSON.stringify({
        title: "New Message",
        body: `${populatedMessage.senderId.username}: ${message}`,
      });

      // Notify all members in the group
      members.forEach(async (member) => {
        const user = await Models.userModel.findById(member._id);

        if (user && user.pwaSubscriptions && user.pwaSubscriptions.length > 0) {
          // Send a notification to each subscription of the user
          user.pwaSubscriptions.forEach(async (subscription) => {
            try {
              await sendNotification(subscription, payload);
              console.log(`Notification envoyée à ${user.username}`);
            } catch (error) {
              console.error(
                `Erreur lors de l'envoi de la notification à ${user.username} :`,
                error,
              );
            }
          });
        }
      });

      // Send notification to the sender (developer) as well
      const sender = await Models.userModel.findById(senderId);

      if (
        sender &&
        sender.pwaSubscriptions &&
        sender.pwaSubscriptions.length > 0
      ) {
        sender.pwaSubscriptions.forEach(async (subscription) => {
          try {
            await sendNotification(subscription, payload);
            console.log("Notification envoyée à l'auteur du message (sender)");
          } catch (error) {
            console.error(
              "Erreur lors de l'envoi de la notification à l'auteur :",
              error,
            );
          }
        });
      }
    }

    res.status(200).json({
      status: true,
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      status: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};
exports.fetchMessages = async (req, res) => {
  const { chatId } = req.params;
  try {
    const messages = await Models.message
      .find({
        $or: [{ constantId: chatId }, { groupId: chatId }],
      })
      .populate("senderId", "username profileImage")
      .populate("reciverId", "username profileImage");

    res.status(200).json({
      status: true,
      data: messages,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching messages",
      error: error.message,
    });
  }
};
exports.fetchConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Models.chatconstant
      .find({
        $or: [
          { senderId: userId },
          { reciverId: userId },
          { groupUserIds: { $in: [userId] } },
        ],
      })
      .populate({
        path: "groupId", // For group conversations
        populate: {
          path: "eventId", // Populate event linked to group chat
          select: "title initialMedia guests", // Only get relevant fields from the event
          populate: {
            path: "guests", // Populate guest information in the event
            select: "username firstName lastName profileImage",
          },
        },
      })
      .populate({
        path: "senderId", // For private conversations
        select: "username firstName lastName profileImage",
      })
      .populate({
        path: "reciverId", // For private conversations
        select: "username firstName lastName profileImage",
      })
      .populate({
        path: "lastmessage", // Last message for both group and private convos
        populate: {
          path: "senderId reciverId",
          select: "username profileImage",
        },
      })
      .exec();

    // Fetch the last 10 messages for each conversation
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conversation) => {
        const messageQuery = conversation.groupId
          ? {
              $or: [
                { constantId: conversation._id },
                { groupId: conversation.groupId },
              ],
            }
          : { constantId: conversation._id };

        const messages = await Models.message
          .find(messageQuery)
          .sort({ createdAt: -1 }) // Trier par date de création, du plus récent au plus ancien
          .limit(20) // Limiter à 10 messages récents
          .populate("senderId", "username profileImage")
          .populate("reciverId", "username profileImage")
          .exec();

        return {
          ...conversation.toObject(), // Convert Mongoose document to plain object
          recentMessages: messages, // Attach recent messages
        };
      }),
    );
    res.status(200).json({
      status: true,
      data: conversationsWithMessages,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({
      status: false,
      message: "Error fetching conversations",
      error: error.message,
    });
  }
};
exports.deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const deleted = await Models.chatconstant.findByIdAndDelete(conversationId);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }

    res.json({ success: true, message: "Conversation deleted successfully" });
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id; // Id de l'utilisateur connecté via le token JWT

  try {
    // Cherche le message par son ID
    const message = await Models.message.findById(messageId);

    if (!message) {
      return res
        .status(404)
        .json({ status: false, message: "Message not found" });
    }

    // Vérifie si l'utilisateur est bien celui qui a envoyé le message
    if (message.senderId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ status: false, message: "You cannot delete this message" });
    }

    // Supprime le message
    await message.deleteOne();

    res
      .status(200)
      .json({ status: true, message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      status: false,
      message: "Failed to delete message",
      error: error.message,
    });
  }
};
exports.startPrivateConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    const senderId = req.user._id;

    // Check if the conversation already exists
    const existingConversation = await Models.chatconstant.findOne({
      senderId: { $in: [senderId, userId] },
      reciverId: { $in: [senderId, userId] },
    });

    if (existingConversation) {
      // If conversation exists, populate it like in fetchConversations
      const populatedConversation = await Models.chatconstant
        .findById(existingConversation._id)
        .populate({
          path: "groupId", // For group conversations
          populate: {
            path: "eventId",
            select: "title initialMedia guests",
            populate: {
              path: "guests",
              select: "username firstName lastName profileImage",
            },
          },
        })
        .populate({
          path: "senderId", // For private conversations
          select: "username firstName lastName profileImage",
        })
        .populate({
          path: "reciverId", // For private conversations
          select: "username firstName lastName profileImage",
        })
        .populate({
          path: "lastmessage", // Last message for both group and private convos
          populate: {
            path: "senderId reciverId",
            select: "username",
          },
        });

      return res.status(200).json({
        status: true,
        message: "Conversation already exists",
        conversation: populatedConversation,
      });
    }

    // If no existing conversation, create a new one
    const newConversation = new Models.chatconstant({
      senderId: senderId,
      reciverId: userId,
    });

    await newConversation.save();

    // Populate the new conversation like in fetchConversations
    const populatedNewConversation = await Models.chatconstant
      .findById(newConversation._id)
      .populate({
        path: "senderId",
        select: "username firstName lastName profileImage",
      })
      .populate({
        path: "reciverId",
        select: "username firstName lastName profileImage",
      });

    return res.status(201).json({
      status: true,
      message: "Private conversation created successfully",
      conversation: populatedNewConversation,
    });
  } catch (error) {
    console.error("Error creating private conversation:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
