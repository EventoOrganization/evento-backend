"use strict";
// socket/socketHandlers.js
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { getEnv } = require("../config/env");
module.exports = (io) => {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            console.error("[Socket Middleware] ❌ No token provided");
            return next(new Error("Authentication error"));
        }
        try {
            const jwtSecret = getEnv("JWT_SECRET_KEY");
            const decoded = jwt.verify(token, jwtSecret);
            socket.userId = decoded.id; // 👈 injecte le userId dans le socket
            console.log("[Socket Middleware] 🔑 Authenticated user:", socket.userId);
            next();
        }
        catch (err) {
            console.error("[Socket Middleware] ❌ Invalid token");
            next(new Error("Authentication error"));
        }
    });
    io.on("connection", (socket) => {
        console.log("New client connected", socket.id, "userId:", socket.userId);
        // ensuite tu appelles tes handlers comme d'habitude :
        const handlersPath = path.join(__dirname, "handlers");
        const handlerFiles = fs.readdirSync(handlersPath);
        handlerFiles.forEach((file) => {
            const handler = require(path.join(handlersPath, file));
            handler({ io, socket });
        });
    });
};
