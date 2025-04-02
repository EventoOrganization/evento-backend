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
const addGuestsToGoogleSheet = async (
  eventId,
  guests,
  tempGuests,
  invitedBy,
) => {
  console.log(
    "Adding guests to Google Sheet Request...",
    "eventId:",
    eventId,
    "guests:",
    guests,
    "tempGuests:",
    tempGuests,
    "invitedBy:",
    invitedBy,
  );
  // 🕒 Génère le timestamp actuel
  const timestamp = new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  // 🧩 Ajoute le timestamp à chaque guest
  const enrichedGuests = guests?.map((guest) => ({
    ...guest,
    timestamp,
  }));

  const enrichedTempGuests = tempGuests?.map((tempGuest) => ({
    ...tempGuest,
    timestamp,
  }));

  try {
    const response = await fetch(GOOGLE_SCRIPT_UPDATE_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "addGuestsToSheet",
        eventId,
        guests: enrichedGuests,
        tempGuests: enrichedTempGuests,
        invitedBy,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();
    if (result.status === "success") {
      console.log("Guests added successfully to Google Sheet.");
    } else {
      console.error("Error adding guests to Google Sheet:", result.message);
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

module.exports = {
  createGoogleSheetForEvent,
  deleteGoogleSheetForEvent,
  addGuestsToGoogleSheet,
  updateGoogleSheetForEvent,
};
