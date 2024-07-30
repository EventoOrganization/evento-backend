const mongoose = require("mongoose");
const dbConnection = async (req, res) => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }
    await mongoose.connect(
      "mongodb+srv://evento:qPsz55AOmtMb347x@cluster0.thv9xbf.mongodb.net/evento?retryWrites=true&w=majority",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("Database connected successfully");
  } catch (error) {
    console.log("++++++++++++++++++++", error);
  }
};
module.exports = dbConnection;
