// helper/emailTemplates.js

// Template pour le header
const headerTemplate = (header) => `
  <div style="background-color: #5b34da; padding: 10px 14px; border-radius: 10px 10px 0 0; text-align: center; color: white;">
    <h3 style="margin: 0;">${header}</h3>
  </div>
`;

// Template pour le footer
const footerTemplate = `
  <div style="padding: 20px; text-align: center; background-color: #f9f9f9; font-size: 12px; color: #777; border-top: 1px solid #ddd;">
    <p style="margin: 0; font-size: 14px; color: #333;">This email was sent by Evento - Your Event Platform.</p>
    <p style="margin: 5px 0;">Need help? Contact us at <a href="mailto:evento_app@outlook.com" style="color: #5f6fed;">evento_app@outlook.com</a>.</p>
    <div style="margin-top: 15px;">
      <a href="https://www.facebook.com/profile.php?id=61566916200982" target="_blank" style="margin: 0 10px; text-decoration: none; color: #5f6fed;">Facebook</a>
      <a href="https://www.instagram.com/eventoapp.io/" target="_blank" style="margin: 0 10px; text-decoration: none; color: #5f6fed;">Instagram</a>
    </div>
    <div style="margin-top: 20px; font-size: 12px; color: #999;">
      <p style="margin: 0;">You are receiving this email because you have an account with Evento or subscribed to our updates.</p>
      <p style="margin: 0;">
        <a href="https://www.evento-app.io/unsubscribe" style="color: #5f6fed; text-decoration: none;">Unsubscribe</a> | 
        <a href="https://www.evento-app.io/privacy" style="color: #5f6fed; text-decoration: none;">Privacy Policy</a>
      </p>
    </div>
  </div>
`;

// Fonction pour générer l'image de l'email
const eventImageTemplate = (imageUrl) => `
  <div style="text-align: center; margin-top: 20px;">
    <div style="max-width: 100%; height: 200px; overflow: hidden; border-radius: 10px;">
      <img src="${
        imageUrl || ""
      }" alt="event-image" style="width: 100%; height: 100%; object-fit: cover;" />
    </div>
  </div>
`;
// Fonction pour envelopper le contenu principal avec le header et le footer
const wrapWithTemplate = (header, content, imageUrl = "") => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff; border: 1px solid #ddd; border-radius: 10px;">
    ${headerTemplate(header)}
    <div style="padding: 20px;">
      ${content}
      ${imageUrl ? eventImageTemplate(imageUrl) : ""}
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
      subject = `Invitation to ${event.title}`;
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
