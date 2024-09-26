const Models = require("../models");
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
          select: "username",
        },
      })
      .exec();

    console.log("Raw conversations before population:", conversations);

    // Log the populated fields for each conversation
    conversations.forEach((conversation, index) => {
      console.log(`Conversation #${index + 1}:`);

      if (conversation.groupId) {
        console.log("Group ID:", conversation.groupId);
        console.log("Populated event ID:", conversation.groupId.eventId);
        console.log("Event title:", conversation.groupId.eventId?.title);
        console.log("Guests:", conversation.groupId.eventId?.guests);
      }

      if (conversation.senderId) {
        console.log("Sender ID:", conversation.senderId);
      }

      if (conversation.reciverId) {
        console.log("Receiver ID:", conversation.reciverId);
      }

      if (conversation.lastmessage) {
        console.log("Last Message:", conversation.lastmessage);
        console.log("Last Message Sender:", conversation.lastmessage.senderId);
        console.log(
          "Last Message Receiver:",
          conversation.lastmessage.reciverId,
        );
      }
    });

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
