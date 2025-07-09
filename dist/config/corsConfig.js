"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOptions = exports.allowedOrigins = void 0;
exports.allowedOrigins = [
    "https://www.evento-app.io",
    "https://evento-app.io",
    "https://evento-web-git-dev-eventos-projects.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "https://backend.evento-app.io",
    "http://localhost:8747",
];
exports.corsOptions = {
    origin: (origin, callback) => {
        if (!origin || exports.allowedOrigins.includes(origin))
            callback(null, true);
        else
            callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
};
