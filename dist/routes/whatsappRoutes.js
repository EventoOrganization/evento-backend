"use strict";
var express = require("express");
var router = express.Router();
router.post("/webhook", (req, res) => {
    const { entry } = req.body;
    // Traitez les messages entrants
    if (entry) {
        entry.forEach((change) => {
            const messages = change.changes[0].value.messages;
            if (messages) {
                messages.forEach((message) => {
                    console.log("Received message:", message);
                });
            }
        });
    }
    res.sendStatus(200); // Répondre avec un statut 200 pour confirmer la réception
});
module.exports = router;
