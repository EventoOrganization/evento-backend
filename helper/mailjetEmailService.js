const mailjet = require("node-mailjet");
const { wrapWithTemplate, getEmailMeta } = require("../helper/emailTemplates");
const { toZonedTime } = require("date-fns-tz");
const { format } = require("date-fns");
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
  if (!user || !guest || !event || !eventLink) {
    console.error("Missing required data for sending the email.");
    return;
  }
  console.log("eventUser", guest);
  const eventLinkWithQuery = `${eventLink}?email=${encodeURIComponent(
    guest.email,
  )}`;
  const imageUrl =
    event.initialMedia?.[0]?.url || "https://via.placeholder.com/600x200"; // Image par défaut
  const formattedDate = new Date(event.details.date).toLocaleDateString(
    undefined,
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  // Génération du header et du subject
  const { subject, header } = getEmailMeta("invite", event);

  // Contenu spécifique de l'email
  const content = `
    <p style="font-size: 16px; color: #333;">Hi ${
      guest.username || "Guest"
    },</p>
    <p style="font-size: 14px; color: #333;">
      You are invited to ${
        isCoHost ? "co-host" : "join"
      } the event hosted by <strong>${user.username || "Evento"}</strong>.
    </p>
    <ul style="list-style-type: none; padding: 0; font-size: 14px; color: #333;">
      <li>📌 <strong>Event:</strong> ${event.title}</li>
      <li>👤 <strong>Host:</strong> ${user.username || "Evento"}</li>
      <li>📅 <strong>Date:</strong> ${formattedDate}</li>
      <li>⏰ <strong>Time:</strong> ${event.details.startTime}</li>
      <li>📍 <strong>Location:</strong> <a href="https://maps.google.com/?q=${encodeURIComponent(
        event.details.location,
      )}" target="_blank" style="color: #5f6fed; text-decoration: none;">
        ${event.details.location}
      </a></li>
    </ul>
    <div style="text-align: center; margin-top: 20px;">
      <a href="${eventLinkWithQuery}" target="_blank" 
      style="display: inline-block; padding: 10px 20px; background-color: #5b34da; color: white; text-decoration: none; border-radius: 5px; font-size: 14px;">
        View Event Details
      </a>
    </div>
  `;

  // Génération de l'email complet avec le template
  const emailContent = wrapWithTemplate(
    header,
    content,
    imageUrl,
    guest.unsubscribeToken,
  );

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
              Email: guest.email,
              Name: guest.username || "Guest",
            },
          ],
          Subject: subject,
          HTMLPart: emailContent,
          CustomID: "EventInvitation",
        },
      ],
    });

    const result = await request;
    console.log(`Invitation email sent to ${guest.email}:`, result.body);
  } catch (error) {
    console.error(`Error sending invitation email to ${guest.email}:`, error);
  }
};
const sendOTPEmail = async (email, otpCode, password = null) => {
  try {
    const { subject, header } = getEmailMeta("otp", { title: "Your OTP Code" });

    const content = password
      ? `
      <h4>Dear User,</h4>
      <p>Use this code to verify your account: <strong>${otpCode}</strong></p>
      <p>Your generated password is: <strong>${password}</strong></p>
      <p>Please keep this password secure or change it after logging in.</p>
    `
      : `
      <h4>Dear User,</h4>
      <p>Use this code to verify your account: <strong>${otpCode}</strong></p>
    `;

    const emailContent = wrapWithTemplate(header, content);

    const request = mailjetClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: process.env.MJ_FROM_EMAIL,
            Name: "Evento - Your Event Platform",
          },
          To: [
            {
              Email: email,
              Name: "User",
            },
          ],
          Subject: subject,
          HTMLPart: emailContent,
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
const sendEventReminderEmail = async (recipient, event) => {
  try {
    // Génération du coHostsPart
    const coHostsPart =
      event.coHosts && event.coHosts.length > 0
        ? `& Co-hosted by ${
            event.coHosts.length === 1
              ? `<strong>${event.coHosts[0].userId.username}</strong>`
              : event.coHosts.length === 2
              ? `<strong>${event.coHosts[0].userId.username}</strong> and <strong>${event.coHosts[1].userId.username}</strong>`
              : `${event.coHosts
                  .slice(0, -1)
                  .map((host) => `<strong>${host.userId.username}</strong>`)
                  .join(", ")}, and <strong>${
                  event.coHosts[event.coHosts.length - 1].userId.username
                }</strong>`
          }`
        : "";

    // Génération de locationPart
    const locationPart = event.details.location
      ? `<li>📍<strong>Location:</strong> 
      <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        event.details.location,
      )}" target="_blank" style="color: #5f6fed; text-decoration: none;">${
          event.details.location
        }</a>
      <br />
      <span style="font-size: 12px; color: #555;">(If the link doesn't work, copy this address: <strong>${
        event.details.location
      }</strong>)</span>
    </li>`
      : "";

    // Génération des métadonnées (sujet et header)
    const { subject, header } = getEmailMeta("reminder", event);

    // Contenu spécifique de l'email
    const content = `
      <p>Dear ${recipient.username},</p>
      <p>This is a reminder for the event: <strong>${
        event.title
      }</strong>, hosted by 
      <strong>${
        event.user.username
      }</strong> ${coHostsPart}, happening tomorrow at 
      ${event.details.startTime}.</p>
      <p>Make sure to be there! Here are the details:</p>
      <ul style="padding-left: 20px;">
        ${locationPart}
        <li>⏰<strong>Start Time:</strong> ${event.details.startTime}</li>
      </ul>
      <div style="text-align: center; margin-top: 20px;">
        <div style="max-width: 100%; height: 200px; overflow: hidden; border-radius: 10px;">
          <img src="${
            event.initialMedia?.[0]?.url || ""
          }" alt="event-image" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <a href="https://www.evento-app.io/event/${event._id}" target="_blank" 
        style="display: inline-block; padding: 10px 20px; background-color: #5b34da; color: white; text-decoration: none; border-radius: 5px;">
          View Event Details
        </a>
      </div>
    `;

    // Contenu complet de l'email avec header/footer
    const emailContent = wrapWithTemplate(
      header,
      content,
      "",
      recipient.unsubscribeToken,
    );

    // Envoi de l'email
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
          Subject: subject,
          HTMLPart: emailContent,
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
    // Boucle sur chaque utilisateur pour envoyer un email
    await Promise.all(
      users.map(async (user) => {
        console.log(`Sending notification email to ${user.email}`);

        // Récupération des métadonnées (sujet et header dynamiques)
        const { subject, header } = getEmailMeta("update", event);

        // Construction des détails du changement
        const changeDetails = buildChangeDetails(changeType, oldData, event);
        const imageUrl = event.initialMedia?.[0]?.url || "";
        // Lien vers l'événement
        const eventLink = `https://www.evento-app.io/event/${event._id}`;

        // Contenu spécifique de l'email
        const content = `
          <p>Dear ${user.username},</p>
          <p>There has been an <strong>${changeType}</strong> change on the event: <strong>${event.title}</strong>.</p>
          ${changeDetails}
          <p>Check out the latest details on our site:</p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${eventLink}" target="_blank" 
            style="display: inline-block; padding: 10px 20px; background-color: #5b34da; color: white; text-decoration: none; border-radius: 5px;">
              View Event
            </a>
          </div>
        `;

        // Génération de l'email complet avec le header et le footer
        const emailContent = wrapWithTemplate(
          header,
          content,
          imageUrl,
          user.unsubscribeToken,
        );

        // Envoi de l'email
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
                Subject: subject,
                HTMLPart: emailContent,
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
      changeDetails = `<p><strong>Location updated:</strong> The event location has changed to <strong>${event.details.location}</strong>.</p>`;
      break;

    case "date":
      // Fonction pour mettre en évidence les changements dynamiquement
      const highlightChanges = (oldValue, newValue, type) => {
        if (oldValue === newValue) {
          return oldValue; // Pas de changement
        }
        // Mise en rouge pour "Previous Date" et en vert pour "New Date"
        return type === "previous"
          ? `<span>${oldValue}</span>`
          : `<span>${newValue}</span>`;
      };

      // Formatage et surlignage des dates et heures
      const previousStartDate = formatDateOnly(oldData.date);
      const newStartDate = formatDateOnly(event.details.date);

      const previousEndDate = formatDateOnly(oldData.endDate);
      const newEndDate = formatDateOnly(event.details.endDate);

      const previousStartTime = highlightChanges(
        formatTimeOnly(oldData.startTime),
        formatTimeOnly(event.details.startTime),
        "previous",
      );
      const newStartTime = highlightChanges(
        formatTimeOnly(oldData.startTime),
        formatTimeOnly(event.details.startTime),
        "new",
      );

      const previousEndTime =
        oldData.endTime &&
        highlightChanges(
          formatTimeOnly(oldData.endTime),
          formatTimeOnly(event.details.endTime),
          "previous",
        );
      const newEndTime =
        event.details.endTime &&
        highlightChanges(
          formatTimeOnly(oldData.endTime),
          formatTimeOnly(event.details.endTime),
          "new",
        );

      const previousTimeZone = highlightChanges(
        oldData.timeZone,
        event.details.timeZone,
        "previous",
      );
      const newTimeZone = highlightChanges(
        oldData.timeZone,
        event.details.timeZone,
        "new",
      );

      // Construction des lignes
      const previousDateLine =
        previousStartDate === previousEndDate
          ? `${highlightChanges(previousStartDate, newStartDate, "previous")} ${
              previousEndTime
                ? `from ${previousStartTime} to ${previousEndTime}`
                : `at ${previousStartTime}`
            } (GMT ${previousTimeZone})`
          : `${highlightChanges(
              previousStartDate,
              newStartDate,
              "previous",
            )} to ${highlightChanges(
              previousEndDate,
              newEndDate,
              "previous",
            )} ${
              previousEndTime
                ? `from ${previousStartTime} to ${previousEndTime}`
                : `at ${previousStartTime}`
            } (GMT ${previousTimeZone})`;

      const newDateLine =
        newStartDate === newEndDate
          ? `${highlightChanges(previousStartDate, newStartDate, "new")} ${
              newEndTime
                ? `from ${newStartTime} to ${newEndTime}`
                : `at ${newStartTime}`
            } (GMT ${newTimeZone})`
          : `${highlightChanges(
              previousStartDate,
              newStartDate,
              "new",
            )} to ${highlightChanges(previousEndDate, newEndDate, "new")} ${
              newEndTime
                ? `from ${newStartTime} to ${newEndTime}`
                : `at ${newStartTime}`
            } (GMT ${newTimeZone})`;

      // Construction des détails avec le format mis à jour
      changeDetails = `
        <p><strong>Date/Time updated:</strong></p>
        <ul style="color: black; margin: 0; padding: 0; list-style: none; gap: 8px; display: flex; flex-direction: column;">
          <li>${newDateLine}</li>
        </ul>
      `;
      break;

    default:
      changeDetails = `<p>There has been an update to the event details.</p>`;
      break;
  }

  return changeDetails;
}

// Fonction pour formater les dates uniquement
function formatDateOnly(date) {
  const formattedDate = new Date(date).toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const day = new Date(date).getDate();
  const daySuffix = getDaySuffix(day);

  return formattedDate.replace(/(\d+)/, `${day}${daySuffix}`);
}

// Fonction pour formater les heures uniquement
function formatTimeOnly(time) {
  return time ? time.replace(":", ".") : "";
}

// Fonction pour obtenir le suffixe correct pour le jour
function getDaySuffix(day) {
  if (day > 3 && day < 21) return "th"; // Cas 4-20
  switch (day % 10) {
    case 1:
      return "st"; // 1st, 21st
    case 2:
      return "nd"; // 2nd, 22nd
    case 3:
      return "rd"; // 3rd, 23rd
    default:
      return "th"; // Par défaut
  }
}

module.exports = {
  sendOTPEmail,
  sendEventInviteEmail,
  sendEventReminderEmail,
  sendUpdateNotification,
};
