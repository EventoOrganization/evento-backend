const AWS = require("aws-sdk");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const ses = new AWS.SES();

// Send Event Invitation Email
const sendEventInviteEmail = async (
  user,
  guest,
  event,
  eventLink,
  isCoHost = false,
) => {
  if (!user || !guest || !event || !eventLink) return;
  console.log("sendEventInviteEmail", user, guest, event, eventLink);
  const params = {
    Source: process.env.SES_NO_REPLY_INVITATIONS, // Using no-reply-invitations@evento-app.io
    Destination: {
      ToAddresses: [guest.email],
    },
    Message: {
      Subject: {
        Data: `You're Invited to ${event.title} by ${
          user.username || "Evento"
        }`,
      },
      Body: {
        Html: {
          Data: `
            <div style="color: #333; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.4; padding: 20px; background-color: #f9f9f9; display: flex; flex-direction: column; align-items: center; gap: 10px;">
              <img src="https://evento-media-bucket.s3.ap-southeast-2.amazonaws.com/icons/icon-512x512.png" alt="Logo" style="width: 100px; height: auto; margin-bottom: 20px;">
              <h3 style="margin: 0;">Hi ${guest.username || "Guest"}</h3>
              <p style="margin: 0;">You are invited to ${
                isCoHost ? "co-host" : "join"
              } the event by <strong>${
            user.username || "on Evento"
          }</strong>.</p>
              <p>Click <a href="${eventLink}" target="_blank" style="text-decoration: none; color: #5f6fed;">here</a> to view the event details.</p>
            </div>
          `,
        },
      },
    },
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log(`Invitation email sent to ${guest.email}:`, result);
  } catch (error) {
    console.error(`Error sending invitation email to ${guest.email}:`, error);
  }
};

// Send OTP Email
const sendOTPEmail = async (email, otpCode) => {
  const params = {
    Source: process.env.SES_NO_REPLY_OTP, // Use no-reply-otp@evento-app.io
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: "Your OTP Code",
      },
      Body: {
        Html: {
          Data: `
            <h3>Your OTP Code</h3>
            <p>Use this code to verify your account: <strong>${otpCode}</strong></p>
          `,
        },
      },
    },
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log(`OTP email sent to ${email}:`, result);
  } catch (error) {
    console.error(`Error sending OTP email to ${email}:`, error);
  }
};

// Send Birthday Email
const sendBirthdayEmail = async (follower, birthdayPerson) => {
  const params = {
    Source: process.env.SES_BIRTHDAY, // Use no-reply-reminder@evento-app.io
    Destination: {
      ToAddresses: [follower.email],
    },
    Message: {
      Subject: {
        Data: `It's ${
          birthdayPerson.username || "your friend's"
        } birthday today!`,
      },
      Body: {
        Html: {
          Data: `
            <h3>Happy Birthday to ${
              birthdayPerson.username || "Your Friend"
            }!</h3>
            <p>Don't forget to wish <strong>${
              birthdayPerson.username || "your friend"
            }</strong> a happy birthday today!</p>
          `,
        },
      },
    },
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log(`Birthday email sent to ${follower.email}:`, result);
  } catch (error) {
    console.error(`Error sending birthday email to ${follower.email}:`, error);
  }
};

// Send Event Reminder Email
const sendEventReminderEmail = async (recipient, event) => {
  const params = {
    Source: process.env.SES_REMINDER, // Use no-reply-reminder@evento-app.io
    Destination: {
      ToAddresses: [recipient.email],
    },
    Message: {
      Subject: {
        Data: `Reminder: ${event.details.name} is happening tomorrow!`,
      },
      Body: {
        Html: {
          Data: `
            <h3>Event Reminder</h3>
            <p>This is a reminder for the event: <strong>${event.details.name}</strong>, happening tomorrow at ${event.details.startTime}.</p>
            <p>Make sure to be there! Here are the details:</p>
            <ul>
              <li><strong>Location:</strong> ${event.details.location}</li>
              <li><strong>Start Time:</strong> ${event.details.startTime}</li>
            </ul>
          `,
        },
      },
    },
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log(`Event reminder email sent to ${recipient.email}:`, result);
  } catch (error) {
    console.error(
      `Error sending event reminder email to ${recipient.email}:`,
      error,
    );
  }
};

// Send Feedback Email using AWS SES
const sendFeedbackEmail = async (user, feedback) => {
  if (!user || !feedback) {
    console.error("Feedback content is missing.");
    return;
  }
  console.log("Sending feedback email via AWS SES...");
  const params = {
    Source: process.env.SES_NO_REPLY_MESSAGES,
    Destination: {
      ToAddresses: ["help@evento-app.io"],
    },
    Message: {
      Subject: {
        Data: "New User Feedback Received",
      },
      Body: {
        Html: {
          Data: `
            <div style="color: #333; font-family: Arial, sans-serif; font-size: 16px;">
              <h3>New Feedback from ${user.username || "Anonymous"}</h3>
              <h4>User Email: ${user.email || "No email provided"}</h4>
              <h4>Feedback:</h4>
              <p>${feedback}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>
          `,
        },
      },
    },
  };

  try {
    const result = await ses.sendEmail(params).promise();
    console.log(
      `Feedback email sent successfully to help@evento-app.io`,
      result,
    );
  } catch (error) {
    console.error("Error sending feedback email via AWS SES:", error);
  }
};

// Export all email functions
module.exports = {
  sendEventInviteEmail,
  sendOTPEmail,
  sendBirthdayEmail,
  sendEventReminderEmail,
  sendFeedbackEmail,
};
