"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ===========================================
// 🚀 Core Setup
// ===========================================
const body_parser_1 = __importDefault(require("body-parser"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const express_ejs_layouts_1 = __importDefault(require("express-ejs-layouts"));
const express_fileupload_1 = __importDefault(require("express-fileupload"));
const express_flash_1 = __importDefault(require("express-flash"));
const express_session_1 = __importDefault(require("express-session"));
const http_1 = __importDefault(require("http"));
const http_errors_1 = __importDefault(require("http-errors"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const corsConfig_1 = require("./config/corsConfig");
const dbConnection_1 = __importDefault(require("./config/dbConnection"));
const basemiddleware_1 = __importDefault(require("./middleware/basemiddleware"));
const routes_1 = __importDefault(require("./routes"));
const stripeRoutes_1 = __importDefault(require("./routes/stripeRoutes"));
// ===========================================
// 🚀 App + HTTP + Socket.IO
// ===========================================
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = http_1.default.createServer(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: corsConfig_1.corsOptions.origin,
        credentials: corsConfig_1.corsOptions.credentials,
        methods: ["GET", "POST"],
    },
});
app.use((req, res, next) => {
    req.io = io;
    next();
});
app.use("/stripe", stripeRoutes_1.default);
// ===========================================
// 🚀 Middleware Config
// ===========================================
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.use(express_1.default.text({ type: "text/plain" }));
app.use(express_1.default.urlencoded({ extended: false }));
app.use((0, cookie_parser_1.default)());
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use((0, express_fileupload_1.default)());
app.use(express_1.default.static(path_1.default.join(__dirname, "public")));
app.set("views", path_1.default.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express_ejs_layouts_1.default);
app.set("layout", "./layout/admin_layout");
app.use((0, cors_1.default)(corsConfig_1.corsOptions));
app.options("*", (0, cors_1.default)(corsConfig_1.corsOptions));
app.set("trust proxy", 1);
app.use((0, express_session_1.default)({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
    },
}));
app.use((0, express_flash_1.default)());
app.use(basemiddleware_1.default);
// ===========================================
// 🚀 Routes
// ===========================================
app.get("/healthz", (_req, res) => {
    res.status(200).send("OK");
});
app.use((req, res, next) => req.url === "/" ? res.redirect("/login") : next());
app.use(routes_1.default);
// ===========================================
// 🚀 Socket.IO
// ===========================================
require("./socket/socketHandlers")(io);
// ===========================================
// 🚀 Errors
// ===========================================
app.use((req, _res, next) => next((0, http_errors_1.default)(404)));
app.use((err, req, res, _next) => {
    console.error("🔥 Global error:", err.stack || err.message);
    res.status(err.status || 500);
    res.render("error", {
        message: err.message,
        error: process.env.NODE_ENV === "development" ? err : {},
    });
});
app.use((err, req, res, _next) => {
    res.status(500).json({ message: err.message || "Unhandled error" });
});
// ===========================================
// 🚀 Launch
// ===========================================
(0, dbConnection_1.default)();
const port = process.env.PORT;
if (!port) {
    console.error("❌ No PORT defined. Exiting.");
    process.exit(1);
}
httpServer.listen(port, () => {
    console.log(`✅ Server listening on port ${port}`);
});
