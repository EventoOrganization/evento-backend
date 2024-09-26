const mailjet = require("node-mailjet");

const mailjetClient = mailjet.apiConnect(
  process.env.MJ_APIKEY_PUBLIC,
  process.env.MJ_APIKEY_PRIVATE,
);
const sendEventInviteEmail = async (
  user,
  guest,
  event,
  eventLink,
  isCoHost = false,
) => {
  // Vérifier que les informations requises sont présentes
  if (!user || !guest || !event || !eventLink) {
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
            <div style="color: #333; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.4; padding: 20px; background-color: #f9f9f9; display: flex; flex-direction: column; align-items: center; gap: 10px;">
              <img src="https://evento-media-bucket.s3.ap-southeast-2.amazonaws.com/logo.png" alt="Logo" style="width: 100px; height: auto; margin-bottom: 20px;">
              <h3 style="margin: 0;">Hi ${guest.username || "Guest"}</h3>
              <p style="margin: 0;">You are invited to ${
                isCoHost ? "co-host" : "join"
              } the event by <strong>${
            user.username || "on Evento"
          }</strong>.</p>
              <p>Click <a href="${eventLink}" target="_blank" style="text-decoration: none; color: #5f6fed;">here</a> to view the event details.</p>
            </div>
          `,
          // HTMLPart: `
          //   <div
          //     style="color: #333; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.4; padding: 20px; background-color: #f9f9f9; display: flex; flex-direction: column; align-items: center; gap: 10px; width: 90%;"
          //   >
          //     <div style="text-align: center;">
          //       <div style="background: linear-gradient(180deg, #a62ba7 0%, #5f6fed 100%); border-radius: 50%; width: 160px; height: 160px; display: flex; justify-content: center; align-items: center; margin-bottom: 20px;">
          //         <img
          //           src="https://evento-media-bucket.s3.ap-southeast-2.amazonaws.com/logo.png"
          //           alt="Logo"
          //           style="width: 100px; height: auto;"
          //         />
          //       </div>
          //       <h3 style="margin: 0;">Hi ${guest.username || "Guest"}</h3>
          //       <p style="margin: 0;">You are invited to ${
          //         isCoHost ? "co-host" : "join"
          //       } the event by <strong>${
          //   user.username || "on Evento"
          // }</strong>.</p>
          //       <p>Click the event below to join: <strong>${
          //         event.title
          //       }</strong></p>
          //     </div>
          //     <a href="${eventLink}" target="_blank" style="text-decoration: none; max-width: 600px; width: 90%;margin: auto;">
          //       <div style="padding: 20px; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 8px; margin-top: 20px; max-width: 600px; width: 100%;">
          //         <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #dddddd;">
          //           <div style="display: flex; align-items: center;">
          //             <img src="${
          //               user?.profileImage
          //             }" alt="User Image" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 10px;" />
          //             <h4 style="margin: 0;">${user?.username || "Evento"}</h4>
          //           </div>
          //           <span>${new Date(
          //             event?.details?.date,
          //           ).toLocaleDateString()}</span>
          //         </div>
          //         <img
          //           src="${event?.initialMedia[0]?.url}"
          //           alt="Event Image"
          //           style="width: 100%; max-width: 600px; height: auto; margin-top: 20px;"
          //         />
          //         <h4 style="margin-top: 20px;">${event.title}</h4>
          //         <p>${event.details.description}</p>
          //       </div>
          //     </a>
          //   </div>
          // `,
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
const sendBirthdayEmail = async (follower, birthdayPerson) => {
  try {
    const request = mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: process.env.MJ_FROM_EMAIL,
            Name: "Evento - Your Event Platform",
          },
          To: [
            {
              Email: follower.email,
              Name: follower.username || "User",
            },
          ],
          Subject: `It's ${
            birthdayPerson.username || "your friend's"
          } birthday today!`,
          HTMLPart: `
            <h3>Happy Birthday to ${
              birthdayPerson.username || "Your Friend"
            }!</h3>
            <p>Today is a special day! Don't forget to wish <strong>${
              birthdayPerson.username || "your friend"
            }</strong> a happy birthday.</p>
          `,
          CustomID: "BirthdayReminder",
        },
      ],
    });

    const result = await request;
    console.log(`Birthday email sent to ${follower.email}:`, result.body);
  } catch (error) {
    console.error(`Error sending birthday email to ${follower.email}:`, error);
  }
};
const sendEventReminderEmail = async (recipient, event) => {
  try {
    const request = mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: process.env.MJ_FROM_EMAIL,
            Name: "Evento - Your Event Platform",
          },
          To: [
            {
              Email: recipient.email,
              Name: recipient.username || "User",
            },
          ],
          Subject: `Reminder: ${event.details.name} is happening tomorrow!`,
          HTMLPart: `
            <h3>Event Reminder</h3>
            <p>This is a reminder for the event: <strong>${event.details.name}</strong>, happening tomorrow at ${event.details.startTime}.</p>
            <p>Make sure to be there! Here are the details:</p>
            <ul>
              <li><strong>Location:</strong> ${event.details.location}</li>
              <li><strong>Start Time:</strong> ${event.details.startTime}</li>
            </ul>
          `,
          CustomID: "EventReminder",
        },
      ],
    });

    const result = await request;
    console.log(
      `Event reminder email sent to ${recipient.email}:`,
      result.body,
    );
  } catch (error) {
    console.error(
      `Error sending event reminder email to ${recipient.email}:`,
      error,
    );
  }
};

module.exports = {
  sendOTPEmail,
  sendResetPasswordEmail,
  sendEventInviteEmail,
  sendBirthdayEmail,
  sendEventReminderEmail,
};
