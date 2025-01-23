const dotenv = require("dotenv");
const EventStatusCleaner = require("../utils/eventStatusCleaner");
const mongoose = require("mongoose");

dotenv.config(); // Charge les variables d'environnement

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/your_db_name";

// Fonction pour exécuter le nettoyage
const runCleanup = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connecté à MongoDB");
    await EventStatusCleaner();

    await mongoose.disconnect();
    console.log("✅ Déconnecté de MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur de connexion MongoDB :", error);
    process.exit(1);
  }
};

runCleanup();
