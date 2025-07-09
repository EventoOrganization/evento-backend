const Models = require("../models");
const socket = require("socket.io");
const { sendNotification } = require("../helper/pwaNotificationPush");

// =============================================================================
// CONVERSATIONS
// =============================================================================
// POST /conversations
exports.createConversations = async (req, res) => {
  const { participants, event } = req.body;
  let conv = await Models.conversationModel.create({
    participants,
    eventId: event ? event._id : null,
    title: event ? event.title : null,
  });

  conv = await conv.populate("participants", "username profileImage");

  res.status(201).json(conv);
};
// GET /conversations
exports.fetchConversations = async (req, res) => {
  try {
    const rawConvs = await Models.conversationModel
      .find({ participants: req.user._id })
      .lean();

    const activeConvs = (
      await Promise.all(
        rawConvs.map(async (conv) => {
          if (!conv.eventId) {
            return conv;
          }
          const evt = await Models.eventModel
            .findById(conv.eventId)
            .select("details.includeChat")
            .lean();

          if (evt?.details?.includeChat) {
            return conv;
          }
          return null;
        }),
      )
    ).filter(Boolean);

    const populatedConvs = await Promise.all(
      activeConvs.map(async (c) => {
        const withPops = await Models.conversationModel
          .findById(c._id)
          .populate("participants", "username profileImage")
          .populate("lastMessage")
          .lean();
        return withPops;
      }),
    );

    const withMessages = await Promise.all(
      populatedConvs.map(async (c) => {
        const recentMessages = await Models.messageSchema
          .find({ conversationId: c._id })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
        return { ...c, recentMessages };
      }),
    );

    return res.json(withMessages);
  } catch (error) {
    console.error("[fetchConversations] Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /conversations/:id/join
exports.joinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const conv = await Models.conversationModel.findById(conversationId);
    if (!conv) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conv.participants.includes(userId)) {
      conv.participants.push(userId);
      await conv.save();
    }

    const populated = await conv.populate(
      "participants",
      "username profileImage",
    );

    res.status(200).json(populated);
  } catch (err) {
    console.error("Error in joinConversation:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
// PATCH /conversations/:id/leave
exports.leaveConversation = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  const conv = await Models.conversationModel.findById(conversationId);
  if (!conv) return res.sendStatus(404);

  // Retirer l'utilisateur
  conv.participants = conv.participants.filter(
    (id) => id.toString() !== userId.toString(),
  );

  await conv.save();

  // Quitter la room socket
  req.io.socketsLeave(conversationId);

  res.status(200).json({ success: true });
};
// DELETE /conversations/:id
exports.deleteConversations = async (req, res) => {
  const { conversationId } = req.params;

  // 1. Supprime tous les messages liés
  await Models.messageSchema.deleteMany({ conversationId });

  // 2. Supprime la conversation elle-même
  await Models.conversationModel.findByIdAndDelete(conversationId);

  // 3. Déconnecte tout le monde de la room
  req.io.in(conversationId).socketsLeave(conversationId);

  res.sendStatus(204);
};

// =============================================================================
// MESSAGES
// =============================================================================
// POST /messages
exports.createMessages = async (req, res) => {
  const { conversationId, message } = req.body;
  const senderId = req.user._id; // récupéré via JWT

  try {
    // Créer le message
    const newMsg = await Models.messageSchema.create({
      conversationId,
      senderId,
      message,
    });

    // Update la conversation
    const conversation = await Models.conversationModel.findById(
      conversationId,
    );

    if (conversation) {
      const update = {
        lastMessage: newMsg._id,
      };

      // Incrémenter unreadCounts pour tous sauf sender
      for (const participantId of conversation.participants) {
        const idStr = participantId.toString();
        if (idStr !== senderId.toString()) {
          update[`unreadCounts.${idStr}`] =
            (conversation.unreadCounts?.get(idStr) || 0) + 1;
        }
      }

      await Models.conversationModel.updateOne(
        { _id: conversationId },
        { $set: update },
      );
    }

    // Notifier en socket
    req.io.to(conversationId).emit("new_message", newMsg);

    res.status(201).json(newMsg);
  } catch (error) {
    console.error("[createMessages] Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /messages
exports.fetchOlderMessages = async (req, res) => {
  const { conversationId, before } = req.query;
  const limit = 20; // Tu peux même le rendre configurable si besoin

  try {
    const messages = await Models.messageSchema
      .find({
        conversationId,
        createdAt: { $lt: new Date(before) },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const totalRemaining = await Models.messageSchema.countDocuments({
      conversationId,
      createdAt: {
        $lt:
          messages.length > 0
            ? messages[messages.length - 1].createdAt
            : new Date(before),
      },
    });

    res.json({
      messages,
      hasMore: totalRemaining > 0,
    });
  } catch (error) {
    console.error("[fetchOlderMessages] Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
