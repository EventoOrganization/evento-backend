"use strict";
const Event = require("../models/eventModel");
const Models = require("../models");
const helper = require("../helper/helper");
const Comment = require("../models/commentModel");
const AnnouncementResponse = require("../models/announcementResponse");
const mongoose = require("mongoose");
const cronSchedule1 = "1 0 * * *";
const TempGuest = require("../models/tempGuestModel");
const schedule = require("node-schedule");
const { createGoogleSheetForEvent, deleteGoogleSheetForEvent, updateGoogleSheetForEvent, } = require("../utils/googleAppScript");
const { sendWhatsAppMessage } = require("../services/whatsappService");
const moment = require("moment");
// const { sendEventInviteEmail } = require("../services/sesEmailService");
const { sendEventInviteEmail, sendUpdateNotification, sendEventReminderEmail, sendAnnouncementEmail, } = require("../helper/mailjetEmailService");
const { sendWhatsAppInvitation } = require("../services/whatsappService");
const getEventStartUtc = (details) => {
    const baseDate = moment.utc(details.date); // ex: 2025-04-24T00:00:00Z
    const [hour, minute] = (details.startTime || "09:00").split(":");
    const tz = details.timeZone || "+00:00";
    return baseDate
        .clone()
        .utcOffset(tz)
        .set({
        hour: Number(hour),
        minute: Number(minute),
        second: 0,
        millisecond: 0,
    })
        .utc(); // convert back to UTC for comparison
};
schedule.scheduleJob("*/5 * * * *", async function () {
    try {
        console.log("🔄 Checking MongoDB connection...");
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
        }
        const nowUtc = moment.utc();
        // Large filter to reduce load, we’ll filter more precisely in code
        const potentialEvents = await Models.eventModel
            .find({
            "details.date": {
                $gte: nowUtc.clone().subtract(1, "days").toDate(),
                $lte: nowUtc.clone().add(2, "days").toDate(),
            },
        })
            .populate("user", "username")
            .populate("coHosts.userId", "username");
        if (potentialEvents.length === 0) {
            console.log("📭 No upcoming events found.");
            return;
        }
        for (const event of potentialEvents) {
            try {
                const eventStartUtc = getEventStartUtc(event.details);
                const reminderStart = eventStartUtc
                    .clone()
                    .subtract(24, "hours")
                    .subtract(5, "minutes");
                const reminderEnd = eventStartUtc
                    .clone()
                    .subtract(24, "hours")
                    .add(5, "minutes");
                if (nowUtc.isBetween(reminderStart, reminderEnd, undefined, "[]")) {
                    console.log(`⏰ Triggered reminder for event: ${event.title} at ${eventStartUtc.toISOString()}`);
                    const goingStatuses = await Models.eventStatusSchema
                        .find({ eventId: event._id, status: "isGoing" })
                        .populate("userId");
                    const goingUsers = goingStatuses
                        .map((status) => status.userId)
                        .filter((user) => user && user.email);
                    for (const recipient of goingUsers) {
                        try {
                            console.log(`📧 Sending reminder to ${recipient.email} for event: ${event.title}`);
                            await sendEventReminderEmail(recipient, event);
                        }
                        catch (emailError) {
                            console.error(`❌ Failed to send email to ${recipient.email}:`, emailError);
                        }
                    }
                }
            }
            catch (eventError) {
                console.error(`⚠️ Error processing event ${event.title}:`, eventError);
            }
        }
    }
    catch (error) {
        console.error("🚨 Error in the scheduled job:", error);
    }
    finally {
        console.log("✅ Job finished.");
    }
});
exports.deletePostEventMedia = async (req, res) => {
    const { eventId } = req.params;
    const { mediaUrl } = req.body;
    try {
        console.log("🗑️ Tentative de suppression du média :", mediaUrl);
        // Récupère l'événement AVANT suppression
        const eventBefore = await Models.eventModel.findById(eventId);
        console.log("📋 Médias AVANT suppression :", eventBefore.postEventMedia);
        // Suppression dans MongoDB avec $pull
        const updatedEvent = await Models.eventModel
            .findByIdAndUpdate(eventId, { $pull: { postEventMedia: { url: mediaUrl } } }, // Supprime par URL
        { new: true })
            .populate("postEventMedia.userId", "username profileImage");
        // Vérifie si MongoDB a bien retiré l'élément
        console.log("✅ Médias APRÈS suppression :", updatedEvent.postEventMedia);
        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }
        res.status(200).json({
            success: true,
            message: "Media deleted successfully",
            postEventMedia: updatedEvent.postEventMedia,
        });
    }
    catch (error) {
        console.error("❌ Erreur suppression média :", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete post-event media",
        });
    }
};
exports.addGuests = async (req, res) => {
    const eventId = req.params.id;
    const { guests, tempGuests, user } = req.body;
    try {
        const event = await Event.findById(eventId);
        if (!event) {
            console.error("Event not found for ID:", eventId);
            return res.status(404).json({ message: "Event not found." });
        }
        const eventLink = `${process.env.CLIENT_URL}/events/${eventId}`;
        const invitedBy = user._id;
        // Traitement des utilisateurs existants
        if (guests && guests.length > 0) {
            for (const guest of guests) {
                const guestId = guest._id?.toString() || guest.id?.toString();
                if (!event.guests.map((id) => id.toString()).includes(guestId)) {
                    event.guests.push(guestId);
                    const guestUser = await Models.userModel.findById(guestId);
                    if (guestUser) {
                        const guestInfo = {
                            _id: guestId,
                            username: guestUser.username,
                            email: guestUser.email,
                            phoneNumber: guestUser.phoneNumber,
                            unsubscribeToken: guestUser.unsubscribeToken,
                            preferences: guestUser.preferences,
                        };
                        // Envoi des notifications
                        if (guestUser.phoneNumber && guestUser.preferences.receiveInvites) {
                            await sendWhatsAppInvitation(guestUser.countryCode, guestUser.phoneNumber, guestUser.username, event.title, eventLink);
                        }
                        else if (guestUser.preferences.receiveInvites) {
                            await sendEventInviteEmail(user, guestInfo, event, eventLink);
                        }
                        else {
                            console.log(`Guest with ID ${guestId} has disabled invite notifications.`);
                        }
                    }
                    else {
                        console.warn(`Guest user not found for ID: ${guestId}`);
                    }
                }
                else {
                    console.log(`Guest ID: ${guestId} already added to the event.`);
                }
            }
        }
        else {
            console.log("No existing guests to process.");
        }
        // Traitement des invités temporaires
        if (tempGuests && tempGuests.length > 0) {
            console.log("Processing temp guests:", tempGuests);
            for (const tempGuestData of tempGuests) {
                const { email, username } = tempGuestData;
                // Vérification si l'utilisateur existe déjà
                const existingUser = await Models.userModel.findOne({ email });
                if (existingUser) {
                    const guestId = existingUser._id;
                    if (!event.guests.includes(guestId)) {
                        event.guests.push(guestId);
                        const guestInfo = {
                            _id: guestId,
                            username: existingUser.username,
                            email: existingUser.email,
                            phoneNumber: existingUser.phoneNumber,
                            unsubscribeToken: existingUser.unsubscribeToken,
                            preferences: existingUser.preferences,
                        };
                        // Envoi des notifications
                        if (existingUser.phoneNumber &&
                            existingUser.preferences.receiveInvites) {
                            await sendWhatsAppInvitation(existingUser.countryCode, existingUser.phoneNumber, existingUser.username, event.title, eventLink);
                        }
                        else if (existingUser.preferences.receiveInvites) {
                            await sendEventInviteEmail(user, guestInfo, event, eventLink);
                        }
                        else {
                            console.log(`User with email ${email} has disabled invite notifications.`);
                        }
                    }
                    else {
                        console.log(`User with email ${email} is already added to the event.`);
                    }
                    continue;
                }
                // Vérification ou création d'un TempGuest
                let tempGuest = await TempGuest.findOne({ email });
                if (!tempGuest) {
                    console.log(`Creating new temp guest for email: ${email}`);
                    tempGuest = new TempGuest({
                        email,
                        username,
                        invitations: [{ eventId, invitedBy }],
                    });
                    await tempGuest.save();
                    console.log(`Temp guest created:`, tempGuest);
                }
                else {
                    console.log(`Updating existing temp guest for email: ${email}`);
                    const existingInvitation = tempGuest.invitations.some((invite) => invite.eventId.toString() === eventId);
                    if (!existingInvitation) {
                        tempGuest.invitations.push({ eventId, invitedBy });
                        await tempGuest.save();
                    }
                    console.log(`Temp guest updated:`, tempGuest);
                }
                if (!event.tempGuests
                    .map((id) => id.toString())
                    .includes(tempGuest._id.toString())) {
                    event.tempGuests.push(tempGuest._id);
                    console.log(`Added temp guest ID: ${tempGuest._id} to event.`);
                }
                else {
                    console.log(`Temp guest ID: ${tempGuest._id} already added to the event.`);
                }
                const guestInfo = {
                    _id: tempGuest._id,
                    username: tempGuest.username,
                    email: tempGuest.email,
                };
                // Envoi des notifications pour les invités temporaires
                await sendEventInviteEmail(user, guestInfo, event, eventLink);
            }
        }
        else {
            console.log("No temp guests to process.");
        }
        // Sauvegarder les modifications de l'événement
        await event.save();
        console.log("Event updated and saved successfully.");
        await updateGoogleSheetForEvent(event, "updateGuest");
        // Récupérer l'événement avec les informations complètes des `tempGuests`
        const updatedEvent = await Event.findById(eventId)
            .populate("guests")
            .populate("tempGuests")
            .exec();
        res
            .status(200)
            .json({ message: "Guests added successfully.", event: updatedEvent });
    }
    catch (error) {
        console.error("Error adding guests:", error);
        res.status(500).json({ message: "Server error." });
    }
};
exports.requestToJoin = async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user._id;
    try {
        console.log("Step 1: Starting requestToJoin"); // Log initial
        // Étape 1: Vérifier l'existence de l'événement
        const event = await Event.findById(eventId);
        if (!event) {
            console.log("Event not found");
            return res.status(404).json({ message: "Event not found" });
        }
        console.log("Step 2: Event found", event);
        // Étape 2: Vérifier si l'utilisateur est déjà dans la liste requested
        console.log("Liste des utilisateurs ayant demandé à rejoindre:", event.requested);
        if (event.requested.some((id) => id.equals(userId))) {
            // Utilise `.equals()` pour comparer les ObjectId
            console.log("User has already requested to join");
            return res
                .status(400)
                .json({ message: "User has already requested to join" });
        }
        // Étape 3: Ajouter l'utilisateur à la liste requested
        event.requested.push(userId);
        await event.save();
        console.log("User added to requested list");
        res
            .status(200)
            .json({ message: "Request to join has been successfully added" });
    }
    catch (error) {
        console.error("Error processing request to join:", error);
        res
            .status(500)
            .json({ message: "An error occurred while processing the request" });
    }
};
exports.acceptRequest = async (req, res) => {
    const { eventId } = req.params;
    const userId = req.body.userId; // L'ID de l'utilisateur à passer en guest
    const requesterId = req.user._id; // L'ID de l'utilisateur qui fait la requête
    try {
        // Récupère l'événement et vérifie qu'il existe
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        // Vérifie si le demandeur est l'hôte ou un co-hôte de l'événement
        const isAuthorized = event.user.equals(requesterId) ||
            event.coHosts.some((coHost) => coHost.userId.equals(requesterId));
        if (!isAuthorized) {
            return res
                .status(403)
                .json({ message: "Unauthorized to accept requests for this event" });
        }
        // Vérifie si l'utilisateur est dans la liste des `requested`
        const isRequestedUser = event.requested.some((id) => id.equals(userId));
        if (!isRequestedUser) {
            return res
                .status(400)
                .json({ message: "User is not in the requested list" });
        }
        // Déplace l'utilisateur de `requested` à `guests`
        event.requested = event.requested.filter((id) => !id.equals(userId)); // Retire de `requested`
        event.guests.push(userId); // Ajoute à `guests`
        const guestInfo = await Models.userModel
            .findById(userId)
            .select("username email");
        const eventLink = `${process.env.CLIENT_URL}/events/${eventId}`;
        await sendEventInviteEmail(req.user, guestInfo, event, eventLink); // averti le user
        await updateGoogleSheetForEvent(event, "updateGuest");
        // Sauvegarde les modifications
        await event.save();
        return res.status(200).json({ message: "User has been added as a guest." });
    }
    catch (error) {
        console.error("Error in acceptRequest:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.storePostEventMedia = async (req, res) => {
    const { eventId, media } = req.body;
    const userId = req.user._id;
    try {
        const mediaWithUser = media.map((item) => ({
            ...item,
            userId: userId,
        }));
        const updatedEvent = await Event.findByIdAndUpdate(eventId, { $push: { postEventMedia: { $each: mediaWithUser } } }, { new: true }).populate("postEventMedia.userId", "username profileImage");
        res.status(200).json({
            success: true,
            data: updatedEvent,
            message: "Post-event media added successfully.",
        });
    }
    catch (error) {
        console.error("Error adding post-event media:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add post-event media",
        });
    }
};
exports.toggleUploadMedia = async (req, res) => {
    const { eventId, allow } = req.body;
    if (!eventId || typeof allow !== "boolean") {
        return res.status(400).json({ message: "Invalid request data" });
    }
    try {
        // Find the event by ID and update the allUploadPhotoVideo field
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        event.allUploadPhotoVideo = allow;
        await event.save();
        return res.status(200).json({ success: true, event });
    }
    catch (error) {
        console.error("Error updating event:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.unGuestUser = async (req, res) => {
    console.log("body", req.body);
    try {
        const { userId, eventId } = req.body;
        // Check if the user ID and event ID are provided
        if (!userId || !eventId) {
            return res.status(400).json({
                status: false,
                message: "User ID and Event ID are required",
            });
        }
        // Find the event by event ID
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                status: false,
                message: "Event not found",
            });
        }
        // Check if the user is in the 'guests' or 'tempGuests' array of the event
        const userIndex = event.guests.indexOf(userId);
        const tempGuestIndex = event.tempGuests.indexOf(userId);
        // If the user is in the guests array, remove them
        if (userIndex !== -1) {
            event.guests.splice(userIndex, 1);
        }
        // If the user is in the tempGuests array, remove them
        if (tempGuestIndex !== -1) {
            event.tempGuests.splice(tempGuestIndex, 1);
        }
        // Save the event with the updated guests/tempGuests
        await event.save();
        await updateGoogleSheetForEvent(event, "updateGuest");
        return res.status(200).json({
            status: true,
            message: "User is no longer a guest for this event",
        });
    }
    catch (error) {
        console.error("Error in un-guest user:", error);
        return res.status(500).json({
            status: false,
            message: "An error occurred while updating the event",
            error: error.message,
        });
    }
};
exports.updateEventField = async (req, res) => {
    const { eventId } = req.params;
    const { field, value, notify = false } = req.body;
    console.log("field", field, "value", value);
    if (!field || value === undefined) {
        return res.status(400).json({ message: "Missing field or value" });
    }
    try {
        const event = await Models.eventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        // Pour vérifier si des changements critiques ont été faits
        let oldData = {};
        let changeType = "";
        switch (field) {
            case "title":
                event.title = value;
                break;
            case "locationData":
                oldData = { location: event.details.location };
                event.details.location = value.location;
                event.details.loc.coordinates = [value.longitude, value.latitude];
                changeType = "location";
                break;
            case "description":
                event.details.description = value;
                break;
            case "eventType":
                event.eventType = value;
                break;
            case "mode":
                event.details.mode = value;
                break;
            case "interests":
                event.interests = value.map((interest) => interest._id);
                break;
            case "url":
                event.details.URLlink = value.url;
                event.details.URLtitle = value.urlTitle;
                break;
            case "date":
                oldData = {
                    date: event.details.date,
                    endDate: event.details.endDate,
                    startTime: event.details.startTime,
                    endTime: event.details.endTime,
                    timeSlots: event.details.timeSlots,
                    timeZone: event.details.timeZone,
                };
                event.details.date = value.startDate;
                event.details.endDate = value.endDate;
                event.details.startTime = value.startTime;
                event.details.endTime = value.endTime;
                event.details.timeSlots = value.timeSlots;
                event.details.timeZone = value.timeZone;
                changeType = "date";
                break;
            case "coHosts":
                event.coHosts = value;
                break;
            case "restricted":
                event.restricted = value;
                break;
            case "showUsersLists":
                event.showUsersLists = value;
                break;
            case "visibility":
                event.visibility = value;
                break;
            case "questions":
                console.log("questions value", value);
                event.questions = value;
                event.details.createRSVP = value.length > 0 ? true : false;
                await updateGoogleSheetForEvent(event, "questions");
                break;
            case "hiddenByUsers":
                if (!Array.isArray(event.hiddenByUsers)) {
                    event.hiddenByUsers = [];
                }
                const userId = value;
                if (event.hiddenByUsers.includes(userId)) {
                    event.hiddenByUsers = event.hiddenByUsers.filter((id) => id.toString() !== userId);
                }
                else {
                    event.hiddenByUsers.push(userId);
                }
                break;
            case "limitedGuests":
                event.limitedGuests = value;
                break;
            case "initialMedia":
                console.log("Updating initialMedia:", value);
                event.initialMedia = value;
                break;
            case "requiresApproval":
                event.requiresApproval = value;
                break;
            case "approvedUserIds":
                if (!mongoose.Types.ObjectId.isValid(value)) {
                    return res.status(400).json({ message: "Invalid user ID format" });
                }
                const userIdToAdd = new mongoose.Types.ObjectId(value);
                if (!Array.isArray(event.approvedUserIds)) {
                    event.approvedUserIds = [];
                }
                if (!event.approvedUserIds.some((id) => id.equals(userIdToAdd))) {
                    event.approvedUserIds.push(userIdToAdd);
                }
            case "includeChat":
                event.details.includeChat = value;
                break;
            default:
                console.log("Invalid field specified");
                return res.status(400).json({ message: "Invalid field" });
        }
        await event.save();
        if (changeType && notify) {
            const goingStatuses = await Models.eventStatusSchema
                .find({
                eventId: eventId,
                status: "isGoing",
            })
                .populate("userId");
            const goingUsers = goingStatuses.map((status) => status.userId);
            await sendUpdateNotification(goingUsers, event, changeType, oldData);
        }
        else if (changeType && !notify) {
            console.log("Event updated without notification");
        }
        res.status(200).json({ message: `${field} updated successfully`, event });
    }
    catch (error) {
        console.error("Error updating event:", error);
        res.status(500).json({ message: "Server error", error });
    }
};
exports.updateGuestsAllowFriend = async (req, res) => {
    try {
        const eventId = req.params.id;
        const { guestsAllowFriend } = req.body;
        // Vérifiez que l'utilisateur qui fait la requête est l'hôte de l'événement
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                status: false,
                message: "Event not found",
            });
        }
        // Vérifiez que l'utilisateur est l'hôte
        if (event.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: false,
                message: "You do not have permission to update this event",
            });
        }
        // Mettre à jour la propriété guestsAllowFriend
        event.guestsAllowFriend = guestsAllowFriend;
        await event.save();
        return res.status(200).json({
            status: true,
            message: "guestsAllowFriend updated successfully",
            data: event,
        });
    }
    catch (error) {
        console.error("Error updating guestsAllowFriend:", error);
        return res.status(500).json({
            status: false,
            message: "An error occurred while updating guestsAllowFriend",
            error: error.message,
        });
    }
};
exports.createEvent = async (req, res) => {
    console.log("req.body", req.body);
    try {
        const { title, username, eventType, mode, location, latitude, longitude, date, endDate, startTime, endTime, description, guests, interests, restricted, uploadedMedia, questions, timeZone, additionalField, UrlLink, UrlTitle, includeChat, createRSVP, coHosts, limitedGuests, requiresApproval, } = req.body;
        // Handle media for event
        let initialMedia = [];
        const imageUrls = uploadedMedia
            .filter((media) => media.type === "image")
            .map((media) => ({
            url: media.url,
            thumbnailUrl: media.thumbnailUrl || null,
            mediumUrl: media.mediumUrl || null,
            type: "image",
        }));
        const videoUrls = uploadedMedia
            .filter((media) => media.type === "video")
            .map((media) => ({ url: media.url, type: "video" }));
        initialMedia = [...imageUrls, ...videoUrls];
        // console.log("Initial Media (Images and Videos):", initialMedia);
        // Step 1: Save the event first (without co-hosts)
        const objToSave = {
            user: req.user._id,
            title,
            eventType,
            details: {
                username,
                loc: {
                    type: "Point",
                    coordinates: [
                        mode === "virtual" ? 0 : longitude || 0,
                        mode === "virtual" ? 0 : latitude || 0,
                    ],
                },
                mode,
                location: mode === "virtual" ? "Virtual Event" : location,
                date,
                endDate,
                startTime,
                endTime,
                timeZone,
                description,
                URLlink: UrlLink || "",
                URLtitle: UrlTitle || "",
                includeChat,
                createRSVP,
                timeSlots: req.body.timeSlots,
            },
            initialMedia,
            guests,
            restricted,
            limitedGuests,
            interests,
            questions,
            additionalField,
            coHosts: Array.isArray(coHosts)
                ? coHosts.map((coHost) => ({
                    userId: coHost.userId,
                    status: coHost.status || "read-only",
                }))
                : [],
            requiresApproval,
        };
        const createdEvent = await Models.eventModel.create(objToSave);
        const googleSheetUrl = await createGoogleSheetForEvent(createdEvent);
        if (googleSheetUrl) {
            createdEvent.googleSheetUrl = googleSheetUrl;
            await createdEvent.save();
        }
        const fullUser = await Models.userModel
            .findById(req.user._id)
            .select("_id username firstName lastName profileImage");
        if (fullUser) {
            createdEvent.user = fullUser;
        }
        const eventLink = `${process.env.CLIENT_URL}/events/${createdEvent._id}`;
        for (const coHost of createdEvent.coHosts) {
            const coHostUser = await Models.userModel.findById(coHost.userId);
            if (coHostUser) {
                await sendEventInviteEmail(req.user, coHostUser, createdEvent, eventLink, true);
            }
        }
        // Step 4: Init chat
        try {
            const participantIds = [
                req.user._id,
                ...createdEvent.coHosts.map((ch) => ch.userId),
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
                console.log("Conversation created:", conv._id, "with participants:", participantIds);
            }
        }
        catch (error) {
            console.error("Error creating group chat or chat constant:", error);
        }
        return res.status(201).json({
            status: true,
            message: "Event created successfully",
            event: createdEvent,
        });
    }
    catch (error) {
        console.error("Error creating event:", error);
        return res
            .status(500)
            .json({ status: false, message: "Internal server error" });
    }
};
exports.getEventById = async (req, res) => {
    // console.log("GETEVENTBYID");
    // console.log("req.query.userId", req.query.userId);
    try {
        const eventId = req.params.id;
        // console.log("Fetching event by ID:", eventId);
        const event = await Event.findById(eventId)
            .populate("user", "username email profileImage")
            .populate("interests", "_id name")
            .populate("guests", "username email profileImage")
            .populate({
            path: "tempGuests",
            select: "username email",
        })
            .populate({
            path: "coHosts.userId",
            select: "username email profileImage",
        })
            .populate("requested", "username email profileImage")
            .populate({
            path: "postEventMedia.userId",
            select: "username profileImage",
        })
            .exec();
        if (!event) {
            // console.log("Event not found");
            return res.status(404).json({
                status: false,
                message: "Event not found",
            });
        }
        // console.log("Event found:", event);
        const userId = req.query.userId;
        // console.log("User ID provided for follow status:", userId);
        // Initialisation des listes d'attendees, favouritees, et refused
        const attendees = [];
        const favouritees = [];
        const refused = [];
        // Récupération des statuts des utilisateurs pour cet événement
        // console.log("Fetching user statuses for event...");
        const userStatuses = await Models.eventStatusSchema
            .find({ eventId })
            .populate("userId", "username email profileImage")
            .exec();
        // console.log("User statuses retrieved:", userStatuses);
        const eventComments = await Models.commentModel
            .find({ eventId, depth: 0 }) // on ne prend que les commentaires "racine"
            .populate("userId", "username profileImage")
            .sort({ createdAt: -1 });
        userStatuses.forEach((statusRecord) => {
            const user = statusRecord.userId;
            if (!user)
                return;
            // console.log(
            //   `Processing status for user: ${user.username}, status: ${statusRecord.status}`,
            // );
            switch (statusRecord.status) {
                case "isGoing":
                    attendees.push({
                        ...user.toObject(),
                        rsvpAnswers: statusRecord.rsvpAnswers || [],
                    });
                    break;
                case "isFavourite":
                    favouritees.push(user);
                    break;
                case "isRefused":
                    refused.push({
                        ...user.toObject(),
                        reason: statusRecord.reason,
                    });
                    break;
                default:
                    break;
            }
        });
        // Préparer le statut de suivi si userId est fourni
        let followingMap = new Map();
        let followersMap = new Map();
        if (userId) {
            // console.log("Fetching follow relationships for user...");
            const followingList = await Models.userFollowModel.find({
                follower: userId,
            });
            const followersList = await Models.userFollowModel.find({
                following: userId,
            });
            // console.log("Following list:", followingList);
            // console.log("Followers list:", followersList);
            followingList.forEach((follow) => {
                followingMap.set(follow.following.toString(), true);
            });
            followersList.forEach((follow) => {
                followersMap.set(follow.follower.toString(), true);
            });
        }
        // Fonction pour enrichir chaque utilisateur avec le statut de suivi
        const addFollowStatus = (user) => {
            if (!user)
                return null;
            // Vérification si user est bien un document Mongoose
            const userIdStr = user._id.toString();
            const userObj = typeof user.toObject === "function" ? user.toObject() : user; // Utilisation directe de user si toObject n'est pas disponible
            // console.log(`Enriching follow status for user: ${user.username}`);
            return {
                ...userObj,
                isIFollowingHim: followingMap.has(userIdStr),
                isFollowingMe: followersMap.has(userIdStr),
            };
        };
        // Enrichir uniquement les `guests`, `attendees`, `favouritees` et `refused`
        const enrichedGuests = event.guests
            ? event.guests.map((guest) => (userId ? addFollowStatus(guest) : guest))
            : [];
        const enrichedAttendees = userId
            ? attendees.map(addFollowStatus)
            : attendees;
        const enrichedFavouritees = userId
            ? favouritees.map(addFollowStatus)
            : favouritees;
        const enrichedRefused = userId ? refused.map(addFollowStatus) : refused;
        // Déterminer si l'utilisateur est hôte ou co-hôte
        const hostStatus = event.user._id.toString() === (userId || "").toString();
        const isCoHost = event.coHosts.some((coHost) => coHost.user && coHost.user._id.toString() === (userId || "").toString());
        // console.log("Host status:", hostStatus);
        // console.log("Co-host status:", isCoHost);
        const eventAnnouncements = await Models.eventAnnouncementsSchema
            .find({
            eventId,
        })
            .lean();
        const announcementResponses = await Models.announcementResponse
            .find({
            eventId,
        })
            .lean();
        const responsesByAnnouncement = {};
        announcementResponses.forEach((response) => {
            const announcementId = response.announcementId.toString();
            if (!responsesByAnnouncement[announcementId]) {
                responsesByAnnouncement[announcementId] = [];
            }
            responsesByAnnouncement[announcementId].push(response);
        });
        const enrichedAnnouncements = eventAnnouncements.map((announcement) => ({
            ...announcement,
            responses: responsesByAnnouncement[announcement._id.toString()] || [],
        }));
        const conv = (await Models.conversationModel.findOne({
            eventId: eventId,
        })) || {};
        // Assemblage de l'événement enrichi
        const enrichedEvent = {
            ...event.toObject(),
            guests: enrichedGuests,
            eventComments,
            tempGuests: event.tempGuests, // Sans enrichissement pour tempGuests
            attendees: enrichedAttendees,
            favouritees: enrichedFavouritees,
            refused: enrichedRefused,
            announcements: enrichedAnnouncements,
            isGoing: userId
                ? attendees.some((attendee) => attendee._id.toString() === userId)
                : false,
            isFavourite: userId
                ? favouritees.some((fav) => fav._id.toString() === userId)
                : false,
            isRefused: userId
                ? refused.some((ref) => ref._id.toString() === userId)
                : false,
            isCoHost,
            isHosted: hostStatus,
            conversation: conv,
        };
        // console.log("Enriched event object prepared:", enrichedEvent);
        return res.status(200).json({
            status: true,
            message: "Event retrieved successfully",
            data: enrichedEvent,
        });
    }
    catch (error) {
        console.error("Error retrieving event:", error);
        return res.status(500).json({
            status: false,
            message: "An error occurred while retrieving the event",
            error: error.message,
        });
    }
};
exports.getRSVPAndReasons = async (req, res) => {
    const { eventId } = req.params;
    try {
        // Récupérer les utilisateurs avec des réponses RSVP (status 'isGoing')
        const rsvpSubmissions = await Models.eventStatusSchema
            .find({
            eventId: eventId,
            status: "isGoing",
        })
            .populate("userId", "username profileImage")
            .select("userId rsvpAnswers");
        // Récupérer les utilisateurs qui ont refusé l'invitation (status 'isRefused') avec la raison
        const refusedStatuses = await Models.eventStatusSchema
            .find({
            eventId: eventId,
            status: "isRefused",
        })
            .populate("userId", "username profileImage")
            .select("userId reason");
        // Structurer la réponse
        res.status(200).json({
            success: true,
            data: {
                rsvpSubmissions, // Utilisateurs avec RSVP et leurs réponses
                refusedStatuses, // Utilisateurs qui ont refusé et leurs raisons
            },
        });
    }
    catch (error) {
        console.error("Error fetching RSVP and refused info:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch RSVP and refused info",
            error: error.message,
        });
    }
};
exports.getUpcomingEvents = async (req, res) => {
    try {
        const userId = req.query.userId;
        const currentDate = new Date();
        const page = parseInt(req.query.page) || 1;
        const limit = 100;
        const skip = (page - 1) * limit;
        // 1️⃣ Récupération des statuts des événements pour le userId
        const eventStatuses = await Models.eventStatusSchema
            .find({})
            .populate("userId", "username profileImage")
            .exec();
        const goingEventIds = eventStatuses
            .filter((s) => s.status === "isGoing")
            .map((s) => s.eventId);
        // 2️⃣ Récupération des événements avec pagination
        const events = await Event.find({
            $or: [
                { "details.endDate": { $gt: currentDate } },
                { "details.date": { $gt: currentDate } },
            ],
        })
            .sort({ "details.date": 1 })
            .skip(skip)
            .limit(limit + 1)
            .populate("user", "username firstName lastName profileImage")
            .populate({
            path: "coHosts.userId",
            select: "username email profileImage",
        })
            .populate("guests", "username firstName lastName profileImage")
            .populate("interests", "name image")
            .populate("requested", "username firstName lastName profileImage")
            .exec();
        // 3️⃣ Vérifier s'il y a plus d'événements après cette page
        const hasMore = events.length > limit;
        if (hasMore) {
            events.pop();
        }
        console.log("📢 Events found:", events.map((e) => ({
            id: e._id,
            title: e.title,
            type: e.eventType,
        })));
        let enrichedEvents = events.map((event) => ({
            ...event.toObject(),
            isGoing: false,
            isFavourite: false,
            isRefused: false,
            attendees: [],
            favouritees: [],
            refused: [],
        }));
        const eventIds = events.map((event) => event._id);
        const relevantEventStatuses = eventStatuses.filter((s) => eventIds.includes(s.eventId));
        const statusMap = {};
        relevantEventStatuses.forEach((status) => {
            if (!statusMap[status.eventId]) {
                statusMap[status.eventId] = {
                    attendees: [],
                    favouritees: [],
                    refused: [],
                };
            }
            if (status.status === "isGoing") {
                statusMap[status.eventId].attendees.push(status.userId);
            }
            else if (status.status === "isFavourite") {
                statusMap[status.eventId].favouritees.push(status.userId);
            }
            else if (status.status === "isRefused") {
                statusMap[status.eventId].refused.push(status.userId);
            }
        });
        if (userId) {
            enrichedEvents = enrichedEvents.map((event) => {
                const userStatus = statusMap[event._id] || {
                    attendees: [],
                    favouritees: [],
                    refused: [],
                };
                return {
                    ...event,
                    isGoing: userStatus.attendees.some((user) => user?._id?.toString() === userId),
                    isFavourite: userStatus.favouritees.some((user) => user?._id?.toString() === userId),
                    isRefused: userStatus.refused.some((user) => user?._id?.toString() === userId),
                    attendees: userStatus.attendees || [],
                    favouritees: userStatus.favouritees || [],
                    refused: userStatus.refused || [],
                    isHosted: event?.user?._id?.toString() === userId,
                };
            });
        }
        // 4️⃣ Retourner les événements paginés avec `hasMore`
        res.status(200).json({
            success: true,
            message: "Upcoming events retrieved successfully",
            events: enrichedEvents,
            hasMore,
        });
    }
    catch (error) {
        console.error("Error in getUpcomingEvents controller:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve upcoming events",
            error: error.message,
        });
    }
};
exports.getEvents = async (req, res) => {
    try {
        const { userId } = req.query;
        const currentDate = new Date();
        const page = parseInt(req.query.page) || 1;
        const limit = 100;
        const skip = (page - 1) * limit;
        const eventStatusesz = await Models.eventStatusSchema.find({ userId });
        let eventFilters;
        const attendEventsIds = eventStatusesz
            .filter((es) => es.status === "isGoing")
            .map((es) => es.eventId.toString());
        const favouriteEventsIds = eventStatusesz
            .filter((es) => es.status === "isFavourite")
            .map((es) => es.eventId.toString());
        if (!userId) {
            // 🌍 Mode Public : uniquement les événements publics futurs
            eventFilters = {
                $and: [
                    {
                        $or: [
                            { "details.endDate": { $gt: currentDate } },
                            { "details.date": { $gt: currentDate } },
                        ],
                    },
                    { eventType: "public" },
                ],
            };
        }
        else {
            // 🔐 Mode Authentifié : événements publics futurs + événements où `userId` est impliqué (passés et futurs)
            eventFilters = {
                $or: [
                    // ✅ 1. Événements publics futurs
                    {
                        $and: [
                            {
                                $or: [
                                    { "details.endDate": { $gt: currentDate } },
                                    { "details.date": { $gt: currentDate } },
                                ],
                            },
                            { eventType: "public" },
                        ],
                    },
                    // ✅ 2. Événements où `userId` est impliqué (passés et futurs)
                    { user: userId },
                    { guests: userId },
                    { "coHosts.userId": userId },
                    { _id: { $in: attendEventsIds } },
                    { _id: { $in: favouriteEventsIds } },
                ],
            };
        }
        // 📡 1️⃣ Récupération des événements
        let events = await Event.find(eventFilters)
            .sort({ "details.date": -1 })
            .skip(skip)
            .limit(limit + 1)
            .populate("user", "username firstName lastName profileImage")
            .populate("coHosts.userId", "username email profileImage")
            .populate("guests", "username firstName lastName profileImage")
            .populate("interests", "name image")
            .populate("requested", "username firstName lastName profileImage")
            .exec();
        const hasMore = events.length > limit;
        if (hasMore) {
            events.pop();
        }
        // 📡 2️⃣ Récupération des statuts des événements pour enrichissement
        const eventIds = events.map((event) => event._id);
        const eventStatuses = await Models.eventStatusSchema
            .find({ eventId: { $in: eventIds } })
            .populate("userId", "username profileImage")
            .exec();
        // 📊 3️⃣ Organisation des statuts des événements dans un Map
        const statusMap = {};
        eventStatuses.forEach((status) => {
            if (!statusMap[status.eventId]) {
                statusMap[status.eventId] = {
                    attendees: [],
                    favouritees: [],
                    refused: [],
                };
            }
            if (status.status === "isGoing") {
                statusMap[status.eventId].attendees.push(status.userId);
            }
            else if (status.status === "isFavourite") {
                statusMap[status.eventId].favouritees.push(status.userId);
            }
            else if (status.status === "isRefused") {
                statusMap[status.eventId].refused.push(status.userId);
            }
        });
        // 🔄 4️⃣ Enrichissement des événements avec les statuts
        let enrichedEvents = events.map((event) => {
            const userStatus = statusMap[event._id] || {
                attendees: [],
                favouritees: [],
                refused: [],
            };
            return {
                ...event.toObject(),
                isGoing: userId
                    ? userStatus.attendees.some((user) => user?._id?.toString() === userId)
                    : false,
                isFavourite: userId
                    ? userStatus.favouritees.some((user) => user?._id?.toString() === userId)
                    : false,
                isRefused: userId
                    ? userStatus.refused.some((user) => user?._id?.toString() === userId)
                    : false,
                attendees: userStatus.attendees || [],
                favouritees: userStatus.favouritees || [],
                refused: userStatus.refused || [],
                isHosted: event?.user?._id?.toString() === userId,
            };
        });
        // ✅ 5️⃣ Retour de la réponse
        res.status(200).json({
            success: true,
            message: "Events retrieved successfully",
            events: enrichedEvents,
            hasMore,
        });
    }
    catch (error) {
        console.error("Error in getEvents:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve events",
            error: error.message,
        });
    }
};
exports.deleteEvent = async (req, res) => {
    try {
        let checkEvent = await Models.eventModel.findOne({ _id: req.params.id });
        if (!checkEvent) {
            return helper.success(res, "Event not found");
        }
        if (checkEvent.user.toString() !== req.user._id.toString()) {
            return helper.success(res, "This event is not created by you");
        }
        // 🟢 Supprimer d'abord la Google Sheet
        await deleteGoogleSheetForEvent(req.params.id);
        // 🟢 Ensuite, supprimer l'événement et toutes les données associées
        let eventDelete = await Models.eventModel.deleteOne({ _id: req.params.id });
        if (eventDelete) {
            await Models.eventStatusSchema.deleteMany({ eventId: req.params.id });
            await Models.eventAttendesUserModel.deleteMany({
                eventId: req.params.id,
            });
            await Models.RSVPSubmission.deleteMany({ eventId: req.params.id });
            await Models.eventNotificationModel.deleteMany({
                eventId: req.params.id,
            });
            await Models.groupChatModel.deleteOne({ eventId: req.params.id });
            await Models.conversationModel.deleteMany({ eventId: req.params.id });
        }
        return helper.success(res, "Event deleted successfully");
    }
    catch (error) {
        console.error("Error deleting event:", error);
        return res.status(500).json({ status: false, message: error.message });
    }
};
exports.updateEventStatus = async (req, res) => {
    const { eventId, userId, status, rsvpAnswers, reason } = req.body;
    console.log("📥 Reçu dans req.body:", JSON.stringify(req.body, null, 2));
    if (!eventId || !userId) {
        console.warn("❌ eventId ou userId manquant");
        return res.status(400).json({
            success: false,
            message: "Event ID and User ID are required",
        });
    }
    try {
        if (!status) {
            console.log("🗑️ Suppression du statut (aucun status fourni)");
            const eventStatus = await Models.eventStatusSchema.findOne({
                eventId,
                userId,
            });
            await Models.eventStatusSchema.deleteOne({ eventId, userId });
            const eventStatusData = eventStatus
                ? { ...eventStatus.toObject(), status: "" }
                : { status: "" };
            const event = await Models.eventModel.findById(eventId).lean();
            console.log("📡 Envoi vers Google Sheet pour suppression de statut");
            await updateGoogleSheetForEvent(event, "updateStatus", {
                userId,
                eventStatus: eventStatusData,
            });
            return res.status(200).json({
                success: true,
                message: "Event status removed successfully",
            });
        }
        console.log("🔁 Création / mise à jour du statut...");
        if (Array.isArray(rsvpAnswers)) {
            for (const ans of rsvpAnswers) {
                if (!ans.questionId || !ans.answer) {
                    console.warn("⚠️ rsvpAnswer mal formé:", ans);
                }
                else {
                    console.log("✅ rsvpAnswer:", ans);
                }
            }
        }
        else {
            console.warn("⚠️ rsvpAnswers n'est pas un tableau !");
        }
        const eventStatus = await Models.eventStatusSchema.findOneAndUpdate({ eventId, userId }, { status, rsvpAnswers, reason }, { new: true, upsert: true, runValidators: true });
        console.log("📦 eventStatus DB:", JSON.stringify(eventStatus.toObject(), null, 2));
        const event = await Models.eventModel.findById(eventId);
        console.log("📄 event:", event?.title, event?._id);
        console.log("📡 Envoi vers Google Sheet...");
        await updateGoogleSheetForEvent(event, "updateStatus", {
            eventStatus,
        });
        return res.status(200).json({
            success: true,
            message: "Event status updated successfully",
            data: eventStatus,
        });
    }
    catch (error) {
        console.error("❌ Error updating event status:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating the event status",
            error: error.message,
        });
    }
};
exports.removeUserFromGoing = async (req, res) => {
    try {
        const { eventId, userId } = req.body;
        // Vérifie si l'admin est bien l'organisateur de l'événement
        const event = await Event.findById(eventId);
        if (!event) {
            return res
                .status(404)
                .json({ success: false, message: "Event not found" });
        }
        // Vérifie si l'utilisateur qui fait la requête est bien admin ou hôte
        if (event.user.toString() !== req.user.id &&
            !event.coHosts.some((coHost) => coHost.userId.toString() === req.user.id)) {
            return res.status(403).json({ success: false, message: "Unauthorized" });
        }
        // Supprime l'entrée de `eventStatusSchema`
        const removedStatus = await Models.eventStatusSchema.findOneAndDelete({
            eventId,
            userId,
            status: "isGoing",
        });
        if (event.approvedUserIds.some((id) => id.toString() === userId)) {
            event.approvedUserIds = event.approvedUserIds.filter((id) => id.toString() !== userId);
            await event.save();
        }
        if (!removedStatus) {
            return res
                .status(404)
                .json({ success: false, message: "User not found in Going list" });
        }
        const eventStatusData = removedStatus
            ? { ...removedStatus.toObject(), status: "" }
            : { status: "" };
        await updateGoogleSheetForEvent(event, "updateStatus", {
            userId,
            eventStatus: eventStatusData,
        });
        res.status(200).json({
            success: true,
            message: "User removed from Going list successfully",
        });
    }
    catch (error) {
        console.error("Error removing user from Going list:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.createAnnouncement = async (req, res) => {
    console.log("req.body", req.body);
    const STATUS_MAPPING = {
        going: "isGoing",
        invited: "invited",
        decline: "isRefused",
    };
    try {
        const { eventId } = req.params;
        const { userId, message, receivers, type, questions = [] } = req.body;
        if (!userId || !message) {
            return res
                .status(400)
                .json({ error: "User ID and message are required." });
        }
        if (!["info", "questionnaire"].includes(type)) {
            return res
                .status(400)
                .json({ error: `Invalid announcement type: ${type}` });
        }
        // Vérification de l'event
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: "Event not found." });
        }
        // Vérification de l'utilisateur qui envoie l'annonce
        const sender = await Models.userModel.findById(userId);
        if (!sender) {
            return res.status(404).json({ error: "Sender not found." });
        }
        // Vérification du status uniquement si on ne passe pas par des userIds
        const mappedStatus = receivers.status
            ? STATUS_MAPPING[receivers.status]
            : null;
        if (!mappedStatus && !receivers.userIds?.length) {
            return res
                .status(400)
                .json({ error: `Invalid status provided: ${receivers.status}` });
        }
        if (type === "questionnaire") {
            if (!Array.isArray(questions) || questions.length === 0) {
                return res.status(400).json({
                    error: "A questionnaire must contain at least one question.",
                });
            }
            for (const q of questions) {
                if (!q.question || typeof q.question !== "string") {
                    return res
                        .status(400)
                        .json({ error: "Each question must have a text." });
                }
            }
        }
        // Création de l'annonce
        const newAnnouncement = new Models.eventAnnouncementsSchema({
            eventId,
            senderId: userId,
            message,
            receivers,
            type,
            questions: type === "questionnaire" ? questions : [],
        });
        await newAnnouncement.save();
        // ✅ Mise à jour du Google Sheet pour les announcements
        if (type === "questionnaire") {
            event.announcement = questions; // nécessaire pour updateGoogleSheetForEvent
            try {
                await updateGoogleSheetForEvent(event, "announcementQuestions");
            }
            catch (err) {
                console.warn("⚠️ Failed to update Google Sheet for announcement:", err);
            }
        }
        let recipients = [];
        // Si on a une liste d'userIds, on récupère directement ces utilisateurs
        if (receivers.userIds?.length > 0) {
            recipients = await Models.userModel.find({
                _id: { $in: receivers.userIds },
            });
        }
        else if (mappedStatus && mappedStatus !== "invited") {
            // Sinon, si on passe par un statut
            const eventStatuses = await Models.eventStatusSchema
                .find({ eventId, status: mappedStatus })
                .populate("userId")
                .exec();
            recipients = eventStatuses.map((es) => es.userId);
        }
        else if (receivers.status === "invited") {
            // Récupération des invités sans statut
            const goingIds = new Set((await Models.eventStatusSchema.find({ eventId, status: "isGoing" })).map((es) => es.userId.toString()));
            const favouritedIds = new Set((await Models.eventStatusSchema.find({
                eventId,
                status: "isFavourite",
            })).map((es) => es.userId.toString()));
            const refusedIds = new Set((await Models.eventStatusSchema.find({ eventId, status: "isRefused" })).map((es) => es.userId.toString()));
            recipients = [
                ...(event.guests || []),
                ...(event.tempGuests || []),
            ].filter((user) => user._id &&
                !goingIds.has(user._id.toString()) &&
                !favouritedIds.has(user._id.toString()) &&
                !refusedIds.has(user._id.toString()));
            // 🔥 Extraire les IDs des invités
            const recipientIds = recipients.map((user) => user._id);
            // Fetch des utilisateurs complets pour avoir les emails
            if (recipientIds.length > 0) {
                recipients = await Models.userModel.find({
                    _id: { $in: recipientIds },
                });
            }
        }
        recipients = Array.isArray(recipients) ? recipients : [recipients];
        // Envoi des emails uniquement aux utilisateurs avec une adresse email
        if (recipients.length > 0) {
            await Promise.allSettled(recipients
                .filter((recipient) => recipient.email)
                .map((recipient) => sendAnnouncementEmail(sender, recipient, event, newAnnouncement)));
        }
        res.status(201).json({
            message: "Announcement created successfully",
            announcement: newAnnouncement,
        });
    }
    catch (error) {
        console.error("❌ Error creating announcement:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.deleteAnnouncement = async (req, res) => {
    try {
        const { announcementId } = req.params;
        const announcement = await Models.eventAnnouncementsSchema.findById(announcementId);
        if (!announcement) {
            return res
                .status(404)
                .json({ status: false, message: "Announcement not found" });
        }
        await Models.eventAnnouncementsSchema.deleteOne({ _id: announcementId });
        await Models.announcementResponse.deleteMany({
            announcementId: announcementId,
        });
        return res
            .status(200)
            .json({ status: true, message: "Announcement deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting announcement:", error);
        return res
            .status(500)
            .json({ status: false, message: "Internal server error" });
    }
};
exports.createComment = async (req, res) => {
    const { eventId, content, parentId = null } = req.body;
    const userId = req.user._id;
    try {
        const depth = parentId ? 1 : 0;
        const newComment = await Comment.create({
            eventId,
            userId,
            content,
            parentId,
            depth,
        });
        await newComment.populate("userId", "username profileImage");
        res.status(201).json({
            message: "Comment created successfully",
            data: newComment,
        });
    }
    catch (error) {
        console.error("Error creating comment:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteComment = async (req, res) => {
    const { commentId } = req.params;
    try {
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }
        // Soft delete version
        comment.isDeleted = true;
        comment.content = "[deleted]";
        await comment.save();
        // await Comment.findByIdAndDelete(commentId);
        res.status(200).json({ message: "Comment deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.submitResponse = async (req, res) => {
    try {
        const { announcementId } = req.params;
        const { eventId, answers } = req.body;
        const userId = req.user._id;
        const existing = await AnnouncementResponse.findOne({
            announcementId,
            userId,
        });
        if (existing) {
            return res.status(400).json({ error: "You already responded." });
        }
        const newResponse = await AnnouncementResponse.create({
            eventId,
            announcementId,
            userId,
            answers,
        });
        const event = await Models.eventModel.findById(eventId).lean();
        const user = await Models.userModel.findById(userId).lean();
        const announcement = await Models.eventAnnouncementsSchema
            .findById(announcementId)
            .lean();
        await updateGoogleSheetForEvent(event, "announcementResponses", {
            user,
            announcement,
            answers: answers.map((ans, index) => ({
                question: announcement.questions?.[index]?.question || `[Unknown Q${index}]`,
                answer: ans.answer,
            })),
        });
        return res.status(201).json({
            message: "Response saved",
            data: newResponse,
        });
    }
    catch (error) {
        console.error("❌ Error submitting response:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
