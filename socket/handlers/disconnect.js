const Models = require("../models/index");
// handlers/disconnect.js
module.exports = ({ socket }) => {
  socket.on("disconnect", (reason) => {
    console.log(`← ${socket.id} disconnected:`, reason);
  });
};
