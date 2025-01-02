// helper/emailTemplates.js

// Template pour le header
const headerTemplate = (header) => `
  <div style="background-color: #5b34da; padding: 10px 14px; border-radius: 10px 10px 0 0; text-align: center; color: white;">
    <h3 style="margin: 0;">${header}</h3>
  </div>
`;

// Template pour le footer
const footerTemplate = `
  <div style="padding: 10px; text-align: center; background-color: #f9f9f9; font-size: 12px; color: #777;">
    <p style="margin: 0;">This email was sent by Evento - Your Event Platform.</p>
    <p style="margin: 0;">Need help? Contact us at <a href="mailto:support@evento-app.io" style="color: #5f6fed;">support@evento-app.io</a>.</p>
  </div>
`;

// Fonction pour envelopper le contenu principal avec le header et le footer
const wrapWithTemplate = (header, content) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff; border: 1px solid #ddd; border-radius: 10px;">
    ${headerTemplate(header)}
    <div style="padding: 20px;">
      ${content}
    </div>
    ${footerTemplate}
  </div>
`;

// Fonction pour générer les meta (subject et header) dynamiques pour différents types d'emails
const getEmailMeta = (type, event) => {
  let subject = "";
  let header = "";

  switch (type) {
    case "reminder":
      subject = `Reminder: ${event.title} is happening tomorrow!`;
      header = `${event.title} - Event Reminder`;
      break;

    case "update":
      subject = `Update: ${event.title}`;
      header = `${event.title} - Event Updated`;
      break;

    case "invite":
      subject = `You're Invited to ${event.title}`;
      header = `${event.title} - Event Invitation`;
      break;

    case "feedback":
      subject = `Feedback Received`;
      header = `Evento - User Feedback`;
      break;

    default:
      subject = `Notification about ${event.title}`;
      header = `${event.title} - Notification`;
      break;
  }

  return { subject, header };
};

module.exports = { wrapWithTemplate, getEmailMeta };
