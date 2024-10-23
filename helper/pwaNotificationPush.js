const webPush = require("web-push");

// Configure les détails VAPID avec les clés d'environnement
webPush.setVapidDetails(
  "mailto:your-email@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

// Fonction pour envoyer une notification
const sendNotification = async (subscription, payload) => {
  try {
    const response = await webPush.sendNotification(subscription, payload);
    console.log("Notification envoyée avec succès :", response);
    return response;
  } catch (error) {
    console.error("Erreur lors de l'envoi de la notification :", error);
    throw new Error("Notification push failed");
  }
};

// Export des fonctions pour être utilisées ailleurs
module.exports = {
  sendNotification,
};
