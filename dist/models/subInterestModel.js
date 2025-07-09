"use strict";
const mongoose = require("mongoose");
const subInterestSchema = new mongoose.Schema({
    name: { type: String, required: true }, // ex: "foot", "basket"
    image: String,
    interest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Interest",
        required: true, // Référence à l'intérêt parent (ex: "sport")
    },
}, { timestamps: true });
const SubInterest = mongoose.model("SubInterest", subInterestSchema);
module.exports = SubInterest;
