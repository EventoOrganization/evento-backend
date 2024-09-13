const mailjet = require("node-mailjet");

const mailjetClient = mailjet.apiConnect(
  process.env.MJ_APIKEY_PUBLIC,
  process.env.MJ_APIKEY_PRIVATE,
);
const sendEventInviteEmail = async (user, guest, event, eventLink) => {
  // Vérifier que les informations requises sont présentes
  if (!user || !guest || !event || !eventLink) {
    console.log("Missing required fields for sending email:", user);
    // console.log("Missing required fields for sending email:", event);
    console.log("Missing required fields for sending email:", eventLink);
    console.log("Missing required fields for sending email:", guest);
    console.error("Missing required fields for sending email:");
    return;
  }

  try {
    const request = mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: process.env.MJ_FROM_EMAIL,
            Name: "Evento - Your Entertaining Event Platform",
          },
          To: [
            {
              Email: guest.email,
              Name: guest.username || "Guest",
            },
          ],
          Subject: `You're Invited to ${event.title} by ${
            user.username || "Evento"
          }`,
          HTMLPart: `
            <div
              style="color: #333; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.4; padding: 20px; background-color: #f9f9f9; display: flex; flex-direction: column; align-items: center; gap: 10px;"
            >
              <div style="text-align: center;">
                <div style="background: linear-gradient(180deg, #a62ba7 0%, #5f6fed 100%); border-radius: 50%; width: 160px; height: 160px; display: flex; justify-content: center; align-items: center; margin-bottom: 20px;">
                  <img
                    src="https://evento-media-bucket.s3.ap-southeast-2.amazonaws.com/logo.png"
                    alt="Logo"
                    style="width: 100px; height: auto;"
                  />
                </div>
                <h3 style="margin: 0;">Hi ${guest.username || "Guest"}</h3>
                <p style="margin: 0;">You are invited to join the event: <strong>${
                  user.username || "Evento"
                }</strong>.</p>
                <p>Click the event below to join: <strong>${
                  event.title
                }</strong></p>
              </div>
              <a href="${eventLink}" target="_blank" style="text-decoration: none;">
                <div style="padding: 20px; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 8px; margin-top: 20px; max-width: 600px; width: 100%;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #dddddd;">
                    <div style="display: flex; align-items: center;">
                      <img src="${
                        user?.profileImage
                      }" alt="User Image" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 10px;" />
                      <h4 style="margin: 0;">${user?.username || "Evento"}</h4>
                    </div>
                    <span>${new Date(
                      event?.details?.date,
                    ).toLocaleDateString()}</span>
                  </div>
                  <img
                    src="${event?.initialMedia[0]?.url}"
                    alt="Event Image"
                    style="width: 100%; max-width: 600px; height: auto; margin-top: 20px;"
                  />
                  <h4 style="margin-top: 20px;">${event.title}</h4>
                  <p>${event.details.description}</p>
                </div>
              </a>
            </div>
          `,
          CustomID: "EventInvitation",
        },
      ],
    });

    const result = await request;
    console.log(
      `****************Invitation email sent to ${guest.email}:*******************`,
      result.body,
    );
  } catch (error) {
    console.error(`Error sending invitation email to ${guest.email}:`, error);
  }
};

module.exports = { sendEventInviteEmail };
const sendOTPEmail = async (email, otpCode) => {
  try {
    const request = mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: process.env.MJ_FROM_EMAIL,
            Name: "Evento - Your Enternaing Event Platform",
          },
          To: [
            {
              Email: email,
              Name: "User",
            },
          ],
          Subject: "Your OTP Code",
          HTMLPart: `
            <h3>Your OTP Code</h3>
            <p>Use this code to verify your account: <strong>${otpCode}</strong></p>
          `,
          CustomID: "OTPVerification",
        },
      ],
    });

    const result = await request;
    console.log("Verification email sent successfully:", result.body);
  } catch (error) {
    console.error("Error sending verification email:", error);
  }
};

const sendResetPasswordEmail = async (email, resetLink) => {
  try {
    const request = mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: process.env.MJ_FROM_EMAIL,
            Name: "Evento - Your Enternaing Event Platform",
          },
          To: [
            {
              Email: email,
              Name: "User",
            },
          ],
          Subject: "Reset your password",
          HTMLPart: `
            <h3>Password Reset Request</h3>
            <p>If you requested to reset your password, click the link below:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>If you didn't request this, please ignore this email.</p>
          `,
          CustomID: "PasswordReset",
        },
      ],
    });

    const result = await request;
    console.log("Password reset email sent successfully:", result.body);
  } catch (error) {
    console.error("Error sending reset password email:", error);
  }
};

module.exports = { sendOTPEmail, sendResetPasswordEmail, sendEventInviteEmail };
