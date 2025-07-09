"use strict";
const Models = require("../../models");
module.exports = ({ socket }) => {
    socket.on("mark-as-read", async ({ conversationId, lastSeenMessageId }) => {
        const userId = socket.userId;
        console.log("[socket.on mark-as-read] 🛬 Received from client:", {
            userId,
            conversationId,
            lastSeenMessageId,
        });
        await Models.conversationModel.updateOne({ _id: conversationId }, {
            $set: {
                [`readReceipts.${userId}`]: lastSeenMessageId,
                [`unreadCounts.${userId}`]: 0, // 🔥 Reset unread count
            },
        });
        console.log("[socket.on mark-as-read] 🛠 Updated conversation readReceipts and unreadCounts!");
        socket.to(conversationId).emit("read_receipt", {
            conversationId,
            userId,
            lastSeenMessageId,
        });
        console.log("[socket.on mark-as-read] 🚀 Emitted read-receipt to other clients.");
    });
};
