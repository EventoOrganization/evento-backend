// /controller/event/createEvent.ts

// Imports
import { RequestHandler } from "express";
import { uploadFileToS3 } from "../../services/uploadFileToS3";
import { validateCreateEventInput } from "../../validators/eventValidator";

// ⚠️ legacy CommonJS modules (js)
// TODO: convert to ES modules when possible
const Models = require("../../models");
const { createGoogleSheetForEvent } = require("../../utils/googleAppScript");
const { sendEventInviteEmail } = require("../../helper/mailjetEmailService");

// Types
interface UploadedMedia {
  url: string;
  type: "image" | "video";
  thumbnailUrl?: string;
  mediumUrl?: string;
}

export const createEvent: RequestHandler = async (req, res) => {
  console.log("📥 [createEvent] Incoming request");
  if (typeof Number !== "function") {
    throw new Error("Global Number object has been overridden.");
  }

  try {
    console.log("🧾 req.files:", req.files);
    console.log("🧾 req.body keys:", Object.keys(req.body));

    const input = validateCreateEventInput(req.body);
    console.log("🧾 input:", input);

    const uploadedMediaFromFiles: UploadedMedia[] = [];

    // Fichiers envoyés via multipart
    if (req.files?.mediaFiles) {
      const media = Array.isArray(req.files.mediaFiles)
        ? req.files.mediaFiles
        : [req.files.mediaFiles];

      console.log("🚀 Uploading media files to S3...");

      for (const file of media) {
        if (typeof file.name !== "string") {
          console.warn("⚠️ Invalid file.name on AWS:", file.name);
          continue;
        }

        const ext = file.name.includes(".")
          ? file.name.split(".").pop()
          : "bin";
        const key = `events/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;

        const url = await uploadFileToS3(
          { data: file.data, mimetype: file.mimetype },
          key,
        );

        uploadedMediaFromFiles.push({
          url,
          type: file.mimetype.startsWith("video") ? "video" : "image",
        });
      }
    }

    // uploadedMedia de req.body
    const imageUrls: UploadedMedia[] = Array.isArray(input.uploadedMedia)
      ? input.uploadedMedia
          .filter((m: any) => m.type === "image")
          .map((m: any) => ({
            url: m.url,
            thumbnailUrl: m.thumbnailUrl || null,
            mediumUrl: m.mediumUrl || null,
            type: "image" as const,
          }))
      : [];

    const videoUrls: UploadedMedia[] = Array.isArray(input.uploadedMedia)
      ? input.uploadedMedia
          .filter((m: any) => m.type === "video")
          .map((m: any) => ({
            url: m.url,
            type: "video" as const,
          }))
      : [];

    const predefinedMedia: UploadedMedia[] = Array.isArray(
      input.predefinedMedia,
    )
      ? input.predefinedMedia.map((m: any) => ({
          url: m.url,
          type: "image",
        }))
      : [];

    const initialMedia: UploadedMedia[] = [
      ...imageUrls,
      ...videoUrls,
      ...uploadedMediaFromFiles,
      ...predefinedMedia,
    ];

    const objToSave = {
      user: req.user?._id,
      title: input.title,
      eventType: input.eventType,
      details: {
        username: input.username,
        loc: {
          type: "Point",
          coordinates:
            input.mode === "virtual"
              ? [0, 0]
              : [
                  parseFloat(String(input.longitude)),
                  parseFloat(String(input.latitude)),
                ],
        },
        mode: input.mode,
        location: input.location,
        date: input.date,
        endDate: input.endDate,
        startTime: input.startTime,
        endTime: input.endTime,
        timeZone: input.timeZone,
        description: input.description,
        URLlink: input.UrlLink,
        URLtitle: input.UrlTitle,
        includeChat: input.includeChat,
        createRSVP: input.createRSVP,
        timeSlots: input.timeSlots,
      },
      initialMedia,
      guests: input.guests,
      restricted: input.restricted,
      limitedGuests: input.limitedGuests
        ? parseInt(String(input.limitedGuests))
        : null,
      interests: input.interests,
      questions: input.questions,
      additionalField: input.additionalField,
      coHosts: Array.isArray(input.coHosts)
        ? input.coHosts.map((coHost: any) => ({
            userId: coHost.userId,
            status: coHost.status || "read-only",
          }))
        : [],
      requiresApproval: input.requiresApproval,
    };

    console.log("💾 Saving event to database...");
    const createdEvent = await Models.eventModel.create(objToSave);

    const googleSheetUrl = await createGoogleSheetForEvent(createdEvent);
    if (googleSheetUrl) {
      createdEvent.googleSheetUrl = googleSheetUrl;
      await createdEvent.save();
    }

    const fullUser = await Models.userModel
      .findById(req.user?._id)
      .select("_id username firstName lastName profileImage");

    if (fullUser) {
      createdEvent.user = fullUser;
    }

    const eventLink = `${process.env.CLIENT_URL}/events/${createdEvent._id}`;
    for (const coHost of createdEvent.coHosts) {
      const coHostUser = await Models.userModel.findById(coHost.userId);
      if (coHostUser) {
        await sendEventInviteEmail(
          req.user,
          coHostUser,
          createdEvent,
          eventLink,
          true,
        );
      }
    }

    try {
      const participantIds = [
        req.user?._id,
        ...createdEvent.coHosts.map((ch: any) => ch.userId),
      ];
      let conv = await Models.conversationModel.findOne({
        eventId: createdEvent._id,
      });
      if (!conv) {
        conv = await Models.conversationModel.create({
          participants: participantIds,
          eventId: createdEvent._id,
          title: createdEvent.title,
        });
      }
    } catch (chatErr) {
      console.error("⚠️ Chat creation failed:", chatErr);
    }

    res.status(201).json({ status: true, event: createdEvent });
  } catch (error) {
    console.error("❌ Fatal error during event creation:", error);
    res.status(500).json({
      status: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};
