const mailjet = require("node-mailjet");

const mailjetClient = mailjet.apiConnect(
  process.env.MJ_APIKEY_PUBLIC,
  process.env.MJ_APIKEY_PRIVATE,
);
const sendEventInviteEmail = async (
  email,
  username,
  eventTitle,
  eventLink,
  role = "guest",
) => {
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
              Email: email,
              Name: username || role,
            },
          ],
          Subject: `You're Invited to ${eventTitle}`,
          HTMLPart: `
            <h3>Hi ${username || "Guest"},</h3>
            <p>You are invited to join the event: <strong>${eventTitle}</strong>.</p>
            <p>Click the link below to join:</p>
            <a href="${eventLink}">${eventLink}</a>
          `,
          CustomID: "EventInvitation",
        },
      ],
    });

    const result = await request;
    console.log(`Invitation email sent to ${email}:`, result.body);
  } catch (error) {
    console.error(`Error sending invitation email to ${email}:`, error);
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

module.exports = { sendOTPEmail, sendResetPasswordEmail };
