const {
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_BUSINESS_ACCOUNT_ID,
} = process.env;
const whatsappBaseURL = `https://graph.facebook.com/v21.0/`;
const User = require("../models/userModel");

const sendWhatsAppOTP = async (req) => {
  try {
    const fetch = (await import("node-fetch")).default;
    const { countryCode, phoneNumber } = req.body;

    if (!countryCode || !phoneNumber) {
      console.error("❌ Error: Missing countryCode or phoneNumber");
      return {
        success: false,
        message: "Both Country Code and Phone Number are required.",
      };
    }

    const recipient = `${countryCode}${phoneNumber}`;
    console.log("✅ Formatted recipient:", recipient);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const body = {
      messaging_product: "whatsapp",
      to: recipient,
      type: "template",
      template: {
        name: "new_user",
        language: { code: "en" },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  link: "https://www.evento-app.io/icon-384x384.png",
                },
              },
            ],
          },
          {
            type: "body",
            parameters: [{ type: "text", text: otp }],
          },
        ],
      },
    };

    console.log("📩 Sending OTP:", body);

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();
    console.log("📬 WhatsApp API response:", data);
    console.log(
      "📬 Full WhatsApp API Response:",
      JSON.stringify(data, null, 2),
    );

    if (!response.ok) {
      console.error("❌ Failed to send WhatsApp OTP:", data);
      return {
        success: false,
        message: "Failed to send OTP via WhatsApp.",
        error: data,
      };
    }

    console.log("✅ WhatsApp OTP sent successfully to:", recipient);

    // Mise à jour de l'OTP dans la base de données
    const userId = req.user._id;
    await User.findByIdAndUpdate(userId, {
      phone_otp: otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
    });

    return { success: true, message: "OTP sent via WhatsApp" };
  } catch (error) {
    console.error("❌ Error sending WhatsApp OTP:", error.message);
    return {
      success: false,
      message: "An unexpected error occurred.",
      error: error.message,
    };
  }
};
const sendWhatsAppInvitation = async (
  countryCode,
  phoneNumber,
  username,
  eventName,
  eventLink,
) => {
  try {
    const fetch = (await import("node-fetch")).default;
    const recipient = `${countryCode}${phoneNumber}`;
    console.log("✅ Formatted recipient:", recipient);
    const body = {
      messaging_product: "whatsapp",
      to: recipient,
      type: "template",
      template: {
        name: "event_invitation",
        language: { code: "en" },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  link: "https://www.evento-app.io/icon-384x384.png",
                },
              },
            ],
          },
          {
            type: "body",
            parameters: [
              { type: "text", text: username },
              { type: "text", text: eventName },
            ],
          },
          {
            type: "button",
            parameters: [
              {
                type: "web_url",
                url: eventLink,
                webview_height_ratio: "compact",
              },
            ],
          },
        ],
      },
    };
    console.log(
      "📌 Requête envoyée à l'API WhatsApp:",
      JSON.stringify(body, null, 2),
    );

    console.log("📩 Sending WhatsApp Invitation:", body);

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const data = await response.json();
    console.log("📬 WhatsApp API response:", data);

    if (!response.ok) {
      console.error("❌ Failed to send WhatsApp invitation:", data);
      return {
        success: false,
        message: "Failed to send invitation via WhatsApp.",
        error: data,
      };
    }

    console.log(`✅ WhatsApp invitation sent successfully to: ${phoneNumber}`);
    return { success: true, message: "Invitation sent via WhatsApp" };
  } catch (error) {
    console.error("❌ Error sending WhatsApp invitation:", error.message);
    return {
      success: false,
      message: "An unexpected error occurred.",
      error: error.message,
    };
  }
};

module.exports = {
  sendWhatsAppOTP,
  sendWhatsAppInvitation,
};
