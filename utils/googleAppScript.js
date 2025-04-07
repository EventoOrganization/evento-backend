const Models = require("../models");
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwVUiR4sFvY-O6qApqkco_ul-gCDXBmOhcdbAiL3h8YFdiZtHqKJAPGXPb-_CPI8BX-Qw/exec";

const GOOGLE_SCRIPT_UPDATE_URL =
  "https://script.google.com/macros/s/AKfycbx3PF9vVEADP-rHk-7LK7FRh4SLKY6cE2anA8q1hAWihXQw4wWnyqni-5nIbMbNYAnGYA/exec";

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
const updateGoogleSheetForEvent = async (event, action, options = {}) => {
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
    case "updateStatus":
      const { eventStatus } = options;

      if (!eventStatus) {
        console.warn("⚠️ updateStatus requires eventStatus in options");
        return;
      }
      console.log("updateStatus eventStatus data", eventStatus);
      const user = await Models.userModel
        .findById(eventStatus.userId)
        .select("username email firstName lastName")
        .lean();
      if (!user || !user.email) {
        console.warn("⚠️ User not found or missing email");
        return;
      }
      const isGuest =
        event.guests?.some((id) => id.toString() === user._id.toString()) ||
        event.tempGuests?.some((id) => id.toString() === user._id.toString());
      console.log(
        "🔍 Questions disponibles:",
        event.questions.map((q) => ({
          id: q._id.toString(),
          label: q.question,
        })),
      );

      console.log("📩 RSVP Answers originales:", eventStatus.rsvpAnswers);

      const enrichedAnswers = (eventStatus.rsvpAnswers || []).map((ans) => {
        const matchedQuestion = event.questions.find(
          (q) => q._id?.toString() === ans.questionId?.toString(),
        );

        const result = {
          question:
            matchedQuestion?.question ||
            `[Question inconnue: ${ans.questionId}]`,
          answer: ans.answer,
        };

        console.log("✅ Mapped RSVP answer:", result);

        return result;
      });
      payload = {
        ...payload,
        statusData: {
          email: user.email,
          username: user.username || "",
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          guest: isGuest,
          status: eventStatus.status || "",
          reason: eventStatus.reason || "",
          rsvpAnswers: enrichedAnswers,
        },
      };
      break;
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
