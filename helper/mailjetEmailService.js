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
  const eventLinkWithQuery = `${eventLink}?email=${encodeURIComponent(
    guest.email,
  )}`;
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
              <img src="https://evento-media-bucket.s3.ap-southeast-2.amazonaws.com/icons/icon-512x512.png" alt="Logo" style="width: 100px; height: auto; margin-bottom: 20px;">
              <h3 style="margin: 0;">Hi ${guest.username || "Guest"}</h3>
              <p style="margin: 0;">You are invited to ${
                isCoHost ? "co-host" : "join"
              } the event by <strong>${
            user.username || "on Evento"
          }</strong>.</p>
              <p>Click <a href="${eventLinkWithQuery}" target="_blank" style="text-decoration: none; color: #5f6fed;">here</a> to view the event details.</p>
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
    // Construire dynamiquement la partie HTML
    const locationPart = event.details.location
      ? `<li><strong>Location:</strong> ${event.details.location}</li>`
      : "";

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
          Subject: `Reminder: ${event.title} is happening tomorrow!`,
          HTMLPart: `
            <h3>Event Reminder</h3>
            <p>This is a reminder for the event: <strong>${event.title}</strong>, happening tomorrow at ${event.details.startTime}.</p>
            <p>Make sure to be there! Here are the details:</p>
            <ul>
              ${locationPart}
              <li><strong>Start Time:</strong> ${event.details.startTime}</li>
              <li><strong>Find the event at:</strong> <a href="https://www.evento-app.io/event/${event._id}" target="_blank">Event Link</a></li>
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
const sendUpdateNotification = async (
  users,
  event,
  changeType,
  oldData = {},
) => {
  try {
    await Promise.all(
      users.map(async (user) => {
        console.log(`Sending notification email to ${user.email}`);
        const changeDetails = buildChangeDetails(changeType, oldData, event); // Supposons une fonction pour construire les détails
        const eventLink = `https://www.evento-app.io/event/${event._id}`;

        const request = mailjetClient
          .post("send", { version: "v3.1" })
          .request({
            Messages: [
              {
                From: {
                  Email: process.env.MJ_FROM_EMAIL,
                  Name: "Evento Notifications",
                },
                To: [
                  {
                    Email: user.email,
                    Name: user.username,
                  },
                ],
                Subject: `Update to ${event.title}`,
                HTMLPart: `
              <h3>Event Update Notification</h3>
              <p>There has been a ${changeType} to the event <strong>${event.title}</strong>.</p>
              ${changeDetails}
              <p>Check out the latest details on our site:</p>
              <a href="${eventLink}" target="_blank">View Event</a>
            `,
                CustomID: "EventUpdateNotification",
              },
            ],
          });
        const result = await request;
        console.log(`Notification sent to ${user.email} for ${changeType}`);
      }),
    );
  } catch (error) {
    console.error("Error sending notification emails:", error);
  }
};
function buildChangeDetails(changeType, oldData, event) {
  let changeDetails = "";
  switch (changeType) {
    case "location":
      changeDetails = `<p>The location of the event has changed.</p>`;
      break;
    case "date":
      changeDetails = `<p>The date or time of the event has changed.</p>`;
      break;
  }
  return changeDetails;
}
const sendFeedbackEmail = async (user, feedback) => {
  try {
    // Vérifiez que les informations nécessaires sont présentes
    if (!user || !feedback) {
      console.error("feedback content is missing.");
      return;
    }

    // Configuration de l'email à envoyer
    const request = mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: "franckdufournetpro@gmail.com",
            Name: "Evento Feedback Service",
          },
          To: [
            {
              Email: "evento_app@outlook.com",
              Name: "Evento Team",
            },
          ],
          Subject: "New User Feedback Received",
          HTMLPart: `
            <h3>New Feedback from ${user.username}</h3>
            <h4>User Email: ${user.email}</h4>
            <h4>Feedback:</h4>
            <p>${feedback}</p>
            <p><strong>Date:</strong> ${new Date()}</p>
          `,
          CustomID: "UserFeedback",
        },
      ],
    });

    const result = await request;
    console.log(
      `Feedback email sent successfully to evento_app@outlook.com:`,
      result.body,
    );
  } catch (error) {
    console.error("Error sending feedback email:", error);
  }
};
module.exports = {
  sendOTPEmail,
  sendResetPasswordEmail,
  sendEventInviteEmail,
  sendBirthdayEmail,
  sendEventReminderEmail,
  sendUpdateNotification,
  sendFeedbackEmail,
};
