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
  const formatTimestampForSheet = (date = new Date(), offsetStr = "+00:00") => {
    if (!offsetStr.match(/^[+-]\d{2}:\d{2}$/)) offsetStr = "+00:00";

    const [sign, hours, minutes] = offsetStr
      .match(/([+-])(\d{2}):(\d{2})/)
      .slice(1);
    const offsetMinutes =
      (parseInt(hours) * 60 + parseInt(minutes)) * (sign === "+" ? 1 : -1);
    const localDate = new Date(date.getTime() + offsetMinutes * 60 * 1000);

    const pad = (n) => n.toString().padStart(2, "0");
    return `${pad(localDate.getDate())}/${pad(
      localDate.getMonth() + 1,
    )}/${localDate.getFullYear()} ${pad(localDate.getHours())}:${pad(
      localDate.getMinutes(),
    )}:${pad(localDate.getSeconds())}`;
  };

  const eventId = event._id.toString();
  const formattedTimestamp = formatTimestampForSheet(
    new Date(),
    event.details?.timeZone || "UTC",
  );

  const capitalize = (str) =>
    typeof str === "string"
      ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
      : "";

  const formatStatus = (status) => {
    switch (status?.toLowerCase()) {
      case "isgoing":
        return "Going";
      case "isrefused":
        return "Refused";
      case "isfavourite":
        return event.eventType === "private" ? "Maybe" : "Favourite";
      default:
        return capitalize(status);
    }
  };

  let payload = { action, eventId };

  switch (action) {
    case "questions": {
      payload = {
        ...payload,
        RSVP: event.questions,
      };
      break;
    }
    case "announcementQuestions": {
      payload = {
        ...payload,
        announcement: event.announcement,
      };
      break;
    }
    case "updateGuest": {
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
        timestamp: formattedTimestamp,
        guests: fullGuests,
        tempGuests: fullTempGuests,
      };
      break;
    }

    case "updateStatus": {
      const { eventStatus } = options;
      if (!eventStatus) {
        console.warn("⚠️ updateStatus requires eventStatus in options");
        return;
      }

      const formattedStatus = formatStatus(eventStatus.status);
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

      const enrichedAnswers = (eventStatus.rsvpAnswers || []).map((ans) => {
        const matched = event.questions.find(
          (q) => q._id?.toString() === ans.questionId?.toString(),
        );
        return {
          question:
            matched?.question || `[Question inconnue: ${ans.questionId}]`,
          answer: ans.answer,
        };
      });

      payload = {
        ...payload,
        timestamp: formattedTimestamp,
        statusData: {
          email: user.email,
          username: user.username || "",
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          guest: isGuest,
          status: formattedStatus,
          reason: eventStatus.reason || "",
          rsvpAnswers: enrichedAnswers,
        },
      };
      break;
    }
    default:
      payload = {};
      break;
  }

  await callGoogleScript(payload, GOOGLE_SCRIPT_UPDATE_URL);
};
const createGoogleSheetForEvent = async (event) => {
  const eventId = event._id.toString();
  const eventTitle = event.title;
  const eventQuestions = event.questions;
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
