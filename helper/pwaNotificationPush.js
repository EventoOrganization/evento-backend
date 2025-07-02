const webPush = require("web-push");

let canSendPush = true;

if (
  !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  !process.env.VAPID_PRIVATE_KEY
) {
  console.warn("🚫 VAPID keys are missing, push notifications are disabled.");
  canSendPush = false;
} else {
  webPush.setVapidDetails(
    "mailto:help@evento-app.io",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

const sendNotification = async (subscription, payload) => {
  if (!canSendPush) {
    console.log("⛔ Push disabled: no VAPID keys.");
    return;
  }

  try {
    const response = await webPush.sendNotification(subscription, payload);
    console.log("✅ Notification sent:", response);
    return response;
  } catch (error) {
    console.error("❌ Push failed:", error);
    throw new Error("Notification push failed");
  }
};

module.exports = {
  sendNotification,
};
