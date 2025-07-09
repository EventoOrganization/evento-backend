"use strict";
const mongoose = require("mongoose");
const cmsSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ["1", "2", "3", "4", "5", "6"], // [1] aboutus_for_user,[2] aboutus_for_resta, [2] pravacy policy, [3] term and condition
        default: "1",
    },
    title: {
        type: String,
        // required: true,
    },
    description: {
        type: String,
        // required: true,
    },
}, { timestamps: true });
const cms = mongoose.model("cms", cmsSchema);
module.exports = cms;
