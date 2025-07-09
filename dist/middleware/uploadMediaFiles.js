"use strict";
const multer = require("multer");
const upload = multer({
    storage: multer.memoryStorage(), // 🔥 pas de fichier local
    limits: {
        fileSize: 20 * 1024 * 1024, // 20 MB
    },
    fileFilter: (req, file, cb) => {
        console.log("📎 req.files length:", req.files?.length); // doit être 2
        console.log("📎 req.body.toUploadFiles:", req.body.toUploadFiles); // ne doit plus exister
        console.log("🔍 Checking file:", {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
        });
        if (file.mimetype.startsWith("image/") ||
            file.mimetype.startsWith("video/")) {
            console.log("✅ Accepted file:", file.originalname);
            cb(null, true);
        }
        else {
            console.warn("⛔ Rejected file (bad type):", file.originalname);
            cb(new Error("Only image and video files are allowed"), false);
        }
    },
});
upload._multerVersion = "instrumented with logs"; // pour confirmer au besoin dans un autre log
module.exports = upload;
