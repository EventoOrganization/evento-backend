const Models = require("../models");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Un utilisateur est connecté avec l'ID:", socket.id);
    socket.on("disconnect", () => {
      console.log("Un utilisateur s'est déconnecté:", socket.id);
    });
  });
};
