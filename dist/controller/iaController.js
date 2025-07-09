"use strict";
const Models = require("../models");
// const { sendFeedbackEmail } = require("../helper/mailjetEmailService");
const { sendFeedbackEmail } = require("../services/sesEmailService");
exports.submitFeedbacks = async (req, res) => {
    try {
        const { feedback } = req.body;
        // Validation du feedback
        if (!feedback || feedback.trim() === "") {
            return res
                .status(400)
                .json({ status: false, message: "Feedback is empty" });
        }
        const userId = req.user.id; // Utilisez l'utilisateur authentifié
        const user = await Models.userModel.findById(userId);
        // Vérifiez si l'utilisateur est valide
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }
        // Enregistrez le feedback dans la base de données
        const newFeedback = new Models.feedbackModel({
            user: userId,
            feedback,
        });
        await newFeedback.save();
        // Envoyez un email avec le feedback à votre cliente
        await sendFeedbackEmail(user, feedback);
        return res.status(200).json({ status: true, message: "Feedback sent" });
    }
    catch (error) {
        console.error("Error submitting feedback:", error);
        return res.status(500).json({ status: false, message: error.message });
    }
};
exports.feedbacks = async (req, res) => {
    console.log("get Feedbacks");
};
exports.feedback = async (req, res) => {
    console.log("get Feedback");
};
