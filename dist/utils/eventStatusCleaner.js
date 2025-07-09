"use strict";
const Event = require("../models/eventModel");
const EventStatus = require("../models/eventStatusSchema");
const EventStatusCleaner = async () => {
    try {
        console.log("🔍 Vérification des statuts d'événements orphelins...");
        // Récupérer tous les statuts
        const allStatuses = await EventStatus.find({}, "eventId");
        // Extraire tous les eventId uniques
        const eventIds = allStatuses.map((status) => status.eventId.toString());
        // Récupérer les événements existants
        const existingEvents = await Event.find({ _id: { $in: eventIds } }, "_id");
        // Extraire les IDs des événements existants
        const existingEventIds = new Set(existingEvents.map((event) => event._id.toString()));
        // Trouver les statuts liés à des événements supprimés
        const orphanStatuses = allStatuses.filter((status) => !existingEventIds.has(status.eventId.toString()));
        if (orphanStatuses.length === 0) {
            console.log("✅ Aucun statut orphelin trouvé.");
            return;
        }
        console.log(`🗑 Suppression de ${orphanStatuses.length} statuts orphelins...`);
        // Supprimer les statuts orphelins
        await EventStatus.deleteMany({
            eventId: { $nin: Array.from(existingEventIds) },
        });
        console.log("✅ Statuts orphelins supprimés avec succès !");
    }
    catch (error) {
        console.error("❌ Erreur lors du nettoyage des statuts :", error);
    }
};
module.exports = EventStatusCleaner;
