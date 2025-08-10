const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function sendEmail({ Source, ToAddresses, Subject, Html }) {
  const params = {
    Source,
    Destination: { ToAddresses },
    Message: {
      Subject: { Data: Subject, Charset: "UTF-8" },
      Body: { Html: { Data: Html, Charset: "UTF-8" } },
    },
  };

  const res = await ses.send(new SendEmailCommand(params));
  return res;
}

async function sendEventInviteEmail(
  user,
  guest,
  event,
  eventLink,
  isCoHost = false,
) {
  if (!user || !guest || !event || !eventLink) return;

  const Html = `
    <div style="color:#333;font-family:Arial,sans-serif;font-size:16px;line-height:1.4;padding:20px;background:#f9f9f9;display:flex;flex-direction:column;align-items:center;gap:10px;">
      <img src="https://evento-media-bucket.s3.ap-southeast-2.amazonaws.com/icons/icon-512x512.png" alt="Logo" style="width:100px;height:auto;margin-bottom:20px;">
      <h3 style="margin:0;">Hi ${guest.username || "Guest"}</h3>
      <p style="margin:0;">You are invited to ${
        isCoHost ? "co-host" : "join"
      } the event by <strong>${user.username || "on Evento"}</strong>.</p>
      <p>Click <a href="${eventLink}" target="_blank" style="text-decoration:none;color:#5f6fed;">here</a> to view the event details.</p>
    </div>
  `;

  try {
    const result = await sendEmail({
      Source: process.env.SES_NO_REPLY_INVITATIONS,
      ToAddresses: [guest.email],
      Subject: `You're Invited to ${event.title} by ${
        user.username || "Evento"
      }`,
      Html,
    });
    console.log(`Invitation email sent to ${guest.email}:`, result.$metadata);
  } catch (error) {
    console.error(`Error sending invitation email to ${guest.email}:`, error);
  }
}

async function sendOTPEmail(email, otpCode) {
  const Html = `
    <h3>Your OTP Code</h3>
    <p>Use this code to verify your account: <strong>${otpCode}</strong></p>
  `;

  try {
    const result = await sendEmail({
      Source: process.env.SES_NO_REPLY_OTP,
      ToAddresses: [email],
      Subject: "Your OTP Code",
      Html,
    });
    console.log(`OTP email sent to ${email}:`, result.$metadata);
  } catch (error) {
    console.error(`Error sending OTP email to ${email}:`, error);
  }
}

async function sendBirthdayEmail(follower, birthdayPerson) {
  const Html = `
    <h3>Happy Birthday to ${birthdayPerson.username || "Your Friend"}!</h3>
    <p>Don't forget to wish <strong>${
      birthdayPerson.username || "your friend"
    }</strong> a happy birthday today!</p>
  `;

  try {
    const result = await sendEmail({
      Source: process.env.SES_BIRTHDAY,
      ToAddresses: [follower.email],
      Subject: `It's ${
        birthdayPerson.username || "your friend's"
      } birthday today!`,
      Html,
    });
    console.log(`Birthday email sent to ${follower.email}:`, result.$metadata);
  } catch (error) {
    console.error(`Error sending birthday email to ${follower.email}:`, error);
  }
}

async function sendEventReminderEmail(recipient, event) {
  const Html = `
    <h3>Event Reminder</h3>
    <p>This is a reminder for the event: <strong>${event.details.name}</strong>, happening tomorrow at ${event.details.startTime}.</p>
    <p>Make sure to be there! Here are the details:</p>
    <ul>
      <li><strong>Location:</strong> ${event.details.location}</li>
      <li><strong>Start Time:</strong> ${event.details.startTime}</li>
    </ul>
  `;

  try {
    const result = await sendEmail({
      Source: process.env.SES_REMINDER,
      ToAddresses: [recipient.email],
      Subject: `Reminder: ${event.details.name} is happening tomorrow!`,
      Html,
    });
    console.log(
      `Event reminder email sent to ${recipient.email}:`,
      result.$metadata,
    );
  } catch (error) {
    console.error(
      `Error sending event reminder email to ${recipient.email}:`,
      error,
    );
  }
}

async function sendFeedbackEmail(user, feedback) {
  if (!user || !feedback) return;

  const Html = `
    <div style="color:#333;font-family:Arial,sans-serif;font-size:16px;">
      <h3>New Feedback from ${user.username || "Anonymous"}</h3>
      <h4>User Email: ${user.email || "No email provided"}</h4>
      <h4>Feedback:</h4>
      <p>${feedback}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
    </div>
  `;

  try {
    const result = await sendEmail({
      Source: process.env.SES_NO_REPLY_MESSAGES,
      ToAddresses: ["help@evento-app.io"],
      Subject: "New User Feedback Received",
      Html,
    });
    console.log(`Feedback email sent to help@evento-app.io`, result.$metadata);
  } catch (error) {
    console.error("Error sending feedback email via AWS SES:", error);
  }
}

module.exports = {
  sendEventInviteEmail,
  sendOTPEmail,
  sendBirthdayEmail,
  sendEventReminderEmail,
  sendFeedbackEmail,
};
