// socket/socketHandlers.js
const fs = require("fs");
const path = require("path");

module.exports = (io) => {
  // Récupère tous les fichiers du dossier handlers
  const handlersPath = path.join(__dirname, "handlers");
  const handlerFiles = fs.readdirSync(handlersPath);

  io.on("connection", (socket) => {
    console.log("New client connected", socket.id);

    // Pour chaque fichier, on require et on exécute le handler
    handlerFiles.forEach((file) => {
      const handler = require(path.join(handlersPath, file));
      // On passe { io, socket } pour que chaque handler y ait accès
      handler({ io, socket });
    });
  });
};
