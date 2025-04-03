const Models = require("../models");
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwVUiR4sFvY-O6qApqkco_ul-gCDXBmOhcdbAiL3h8YFdiZtHqKJAPGXPb-_CPI8BX-Qw/exec";

const GOOGLE_SCRIPT_UPDATE_URL =
  "https://script.google.com/macros/s/AKfycbzxxnIe2gUYySIqAlO2Vqh9hqoQEXn_gO2jhx3UXPGxeRUsBb5wIdCWK0uEiPoCzYOSDg/exec";
// Function to create a Google Sheet for an event called "eventTitleeventId"
const callGoogleScript = async (payload, url) => {
  try {
    console.log("📤 Envoi à Google Script");
    console.log("🔗 URL:", url);
    console.log("⚙️ Action:", payload.action);
    console.log("📦 Payload complet:", JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    console.log("🧾 Réponse brute (text):", text);

    let result;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error("❌ JSON.parse a échoué. Réponse HTML probable:", text);
      return null;
    }

    if (result.status !== "success") {
      console.error("❌ Google Script Error:", result.message);
    } else {
      console.log("✅ Réponse JSON réussie:", result);
    }

    return result;
  } catch (error) {
    console.error("❌ Google Script Fetch Error:", error);
    return null;
  }
};
const updateGoogleSheetForEvent = async (event, action) => {
  const eventId = event._id.toString();
  let payload = {
    action,
    eventId,
  };
  switch (action) {
    case "questions":
      payload = {
        ...payload,
        eventQuestions: event.questions,
      };
      break;
    case "updateGuest":
      const fullGuests = await Models.userModel
        .find({ _id: { $in: event.guests } })
        .select("email username firstName lastName")
        .lean();

      const fullTempGuests = await Models.tempGuestModel
        .find({ _id: { $in: event.tempGuests } })
        .select("email username")
        .lean();
      payload = {
        ...payload,
        timestamp: new Date().toISOString(),
        guests: fullGuests,
        tempGuests: fullTempGuests,
      };
      break;
    case "userStatus":
      payload = { ...payload };
    default:
      payload = {};
      break;
  }

  await callGoogleScript(payload, GOOGLE_SCRIPT_UPDATE_URL);
};
const createGoogleSheetForEvent = async (event) => {
  // goal is to create a sheet with 2 tabs [event infos, users]
  const eventId = event._id.toString(); // sheetTitle
  const eventTitle = event.title; // tab1 Title
  const eventQuestions = event.questions; // dynamic tab2 columns headers
  const payload = {
    action: "createEventSheet",
    eventId,
    eventTitle,
    eventQuestions,
  };
  const result = await callGoogleScript(payload, GOOGLE_SCRIPT_URL);
  return result.sheetUrl;
};
const deleteGoogleSheetForEvent = async (eventId) => {
  const payload = {
    action: "deleteEventSheet",
    eventId,
  };
  const result = await callGoogleScript(payload, GOOGLE_SCRIPT_URL);
  return result;
};

module.exports = {
  createGoogleSheetForEvent,
  deleteGoogleSheetForEvent,
  updateGoogleSheetForEvent,
};
