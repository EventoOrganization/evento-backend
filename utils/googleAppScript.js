const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwVUiR4sFvY-O6qApqkco_ul-gCDXBmOhcdbAiL3h8YFdiZtHqKJAPGXPb-_CPI8BX-Qw/exec";

// Function to create a Google Sheet for an event called "eventTitleeventId"
const createGoogleSheetForEvent = async (event) => {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "createEventSheet",
        eventId: event._id,
        eventTitle: event.title,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();
    if (result.status === "success") {
      return result.sheetUrl;
    } else {
      console.error("Error creating Google Sheet:", result.message);
      return null;
    }
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
};
const updateGoogleSheetRSVP = async (event, responses, rsvpStatus) => {
  await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "updateRSVP",
      rsvpStatus,
      responses,
    }),
    headers: { "Content-Type": "application/json" },
  });
};
const deleteGoogleSheetForEvent = async (eventId) => {
  try {
    console.log("Deleting Google Sheet for event:", eventId);
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "deleteEventSheet", eventId }),
      headers: { "Content-Type": "application/json" },
    });

    const result = await response.json();
    if (result.status !== "success") {
      console.error("Error deleting Google Sheet:", result.message);
    }
  } catch (error) {
    console.error("Failed to delete Google Sheet:", error);
  }
};

module.exports = {
  createGoogleSheetForEvent,
  deleteGoogleSheetForEvent,
  updateGoogleSheetRSVP,
};
