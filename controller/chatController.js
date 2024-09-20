const Models = require("../models");
const helper = require("../helper/helper");
const moment = require("moment");
exports.sendMessage = async (req, res) => {
  console.log(
    "🛠️ ~ file: chatController.js:exports.sendMessage ~ req:",
    req.body,
  );
  const { message, senderId, conversationId, messageType } = req.body;

  if (!message || !senderId || !conversationId || !messageType) {
    return res.status(400).json({
      status: false,
      message:
        "❌ ~ Missing required fields (message, senderId, conversationId).",
    });
  }

  try {
    console.log(
      `ℹ️ ~ Looking up conversation for conversationId: ${conversationId}`,
    );
    const conversation = await Models.chatconstant.findById(conversationId);

    if (!conversation) {
      console.log("❌ ~ Conversation not found");
      return res.status(404).json({
        status: false,
        message: "Conversation not found.",
      });
    }

    const { isGroup, targetId } = conversation;

    const newMessage = new Models.message({
      senderId,
      reciverId: isGroup ? undefined : targetId,
      groupId: isGroup ? targetId : undefined,
      constantId: conversationId,
      message,
      message_type: messageType,
    });
    await newMessage.save();
    // console.log("✅ ~ Message saved successfully:", newMessage);

    res.status(200).json({
      status: true,
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};

exports.fetchConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("Fetching conversations for user:", userId);

    const conversations = await Models.chatconstant
      .find({
        $or: [
          { senderId: userId },
          { reciverId: userId },
          { groupUserIds: { $in: [userId] } },
        ],
      })
      .populate({
        path: "lastmessage",
        populate: { path: "senderId reciverId", select: "username" },
      })
      .populate("groupId", "groupName");

    console.log("Conversations found:", conversations);

    res.status(200).json({
      status: true,
      data: conversations,
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

exports.fetchMessages = async (req, res) => {
  console.log(
    "🛠️ ~ file: chatController.js:exports.fetchMessages ~ req:",
    req.params,
  );
  const { chatId } = req.params;
  try {
    const messages = await Models.message
      .find({
        $or: [{ constantId: chatId }, { groupId: chatId }],
      })
      .populate("senderId", "username profileImage");

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
