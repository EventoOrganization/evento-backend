import { Types } from "mongoose";
const Models = require("../../models");

export const createMessage = async (req: any, res: any) => {
  const { conversationId, message } = req.body;
  const senderId = req.user?._id;

  console.log("[createMessage] senderId:", senderId);
  console.log("[createMessage] conversationId:", conversationId);
  console.log("[createMessage] message:", message);

  if (!Types.ObjectId.isValid(conversationId)) {
    console.warn("[createMessage] ❌ Invalid conversationId");
    return res.status(400).json({ message: "Invalid conversation ID" });
  }

  try {
    const newMsg = await Models.messageSchema.create({
      conversationId,
      senderId,
      message,
    });

    console.log("[createMessage] ✅ Message created:", newMsg);

    const conversation = await Models.conversationModel.findById(
      conversationId,
    );
    if (conversation) {
      console.log("[createMessage] Found conversation:", conversation._id);

      const update: Record<string, any> = {
        lastMessage: newMsg._id,
      };

      for (const participantId of conversation.participants) {
        const idStr = participantId.toString();
        if (idStr !== senderId.toString()) {
          const current = conversation.unreadCounts?.get(idStr) || 0;
          update[`unreadCounts.${idStr}`] = current + 1;
        }
      }

      await Models.conversationModel.updateOne(
        { _id: conversationId },
        { $set: update },
      );
      console.log("[createMessage] ✅ Updated conversation unread counts");
    } else {
      console.warn("[createMessage] ⚠️ Conversation not found");
    }

    req.io?.to(conversationId).emit("new_message", newMsg);
    console.log("[createMessage] 📤 Emitted socket message");

    res.status(201).json(newMsg);
  } catch (error) {
    console.error("[createMessage.ts] ❌ Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
