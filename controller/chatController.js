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
    event,
    title: event ? event.title : null,
  });

  conv = await conv.populate("participants", "username profileImage");

  res.status(201).json(conv);
};
// GET /conversations
exports.fetchConversations = async (req, res) => {
  const convs = await Models.conversationModel
    .find({ participants: req.user._id })
    .populate("participants", "username profileImage")
    .lean();

  // for each conv, grab its last 10 messages
  const withMessages = await Promise.all(
    convs.map(async (c) => {
      const recentMessages = await Models.messageSchema
        .find({ conversationId: c._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      return { ...c, recentMessages };
    }),
  );

  res.json(withMessages);
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

  res.sendStatus(200);
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
  const senderId = req.user._id; // via JWT

  const newMsg = await Models.messageSchema.create({
    conversationId,
    senderId,
    message,
  });

  // Notifie via socket (instantané aux autres clients)
  req.io.to(conversationId).emit("new_message", newMsg);
  console.log("new_message", newMsg);
  res.status(201).json(newMsg);
};
