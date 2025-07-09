"use strict";
const mongoose = require("mongoose");
const interestSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: String,
    subInterests: [
        { type: mongoose.Schema.Types.ObjectId, ref: "SubInterest" },
    ],
}, { timestamps: true });
const interest = mongoose.model("interests", interestSchema);
module.exports = interest;
