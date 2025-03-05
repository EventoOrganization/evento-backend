const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyBvjfDKBhUGdQjJ4v3Ud9qDGaHLTf1Jp2giuWlsyplLp-0jZl0QqBGOFBUtRLkeFwLSw/exec";

const createGoogleSheetForEvent = async (event) => {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "createEventSheet",
        eventTitle: event.title,
        date: event.date,
        location: event.details.location,
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
const deleteGoogleSheetForEvent = async (eventTitle) => {
  await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "deleteEventSheet",
      eventTitle,
    }),
    headers: { "Content-Type": "application/json" },
  });
};

module.exports = {
  createGoogleSheetForEvent,
  deleteGoogleSheetForEvent,
  updateGoogleSheetRSVP,
};
