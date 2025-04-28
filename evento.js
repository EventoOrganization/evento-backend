// ===========================================
// 🚀 Import required modules
// ===========================================
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var session = require("express-session");
const flash = require("express-flash");
var logger = require("morgan");
var dbConnection = require("./.config/dbConnection");
require("dotenv").config();
const basemiddleware = require("./middleware/basemiddleware");
var bodyParser = require("body-parser");
const fileupload = require("express-fileupload");
var expressLayouts = require("express-ejs-layouts");

// ===========================================
// 🚀 Import routers
// ===========================================

var indexRouter = require("./routes/dashBoardRoutes");
var usersRouter = require("./routes/users");
const cmsRoutes = require("./routes/cmsRoutes");
const chatRoutes = require("./routes/chatRoutes");
var authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
var profileRoutes = require("./routes/profileRoutes");
const sesRoutes = require("./routes/sesRoutes");
const iaRoutes = require("./routes/iaRoutes");
const sitemapRoutes = require("./routes/sitemapRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");

// ===========================================
// 🚀 Initialize Express app
// ===========================================
var app = express();

// ===========================================
// 🚀 Configure CORS
// ===========================================
const cors = require("cors");

const allowedOrigins = [
  "https://www.evento-app.io",
  "https://evento-app.io",
  "https://evento-web-git-dev-eventos-projects.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://backend.evento-app.io",
  "http://localhost:8747",
];

const checkOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};

const corsOptions = {
  origin: checkOrigin,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  allowedHeaders: "Content-Type,Authorization",
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ===========================================
// 🚀 Configure View Engine (EJS)
// ===========================================
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ===========================================
// 🚀 Configure Middlewares
// ===========================================
app.use(logger("dev"));
app.use(express.json());
app.use(express.text({ type: "text/plain" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(fileupload());

// ===========================================
// 🚀 Configure Static files
// ===========================================
app.use(express.static(path.join(__dirname, "public")));

// ===========================================
// 🚀 Configure Layouts
// ===========================================
app.use(expressLayouts);
app.set("layout", "./layout/admin_layout");

// ===========================================
// 🚀 Redirect root "/" to "/login"
// ===========================================
app.use((req, res, next) => {
  if (req.url === "/") {
    res.redirect("/login");
    return;
  }
  next();
});

// ===========================================
// 🚀 Create HTTP server
// ===========================================
const http = require("http").createServer(app);

// ===========================================
// 🚀 Configure Socket.IO
// ===========================================
const io = require("socket.io")(http, {
  cors: {
    origin: checkOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Attach io instance to each request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Load socket.io handlers
require("./socket/socketHandlers")(io);

// ===========================================
// 🚀 Configure Session
// ===========================================
app.set("trust proxy", 1);
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 24 * 60 * 60 * 365 * 1000, // 1 year
      sameSite: "lax",
      // secure: true, // Uncomment when using HTTPS
    },
  }),
);
// ===========================================
// 🚀 Configure Flash messages
// ===========================================
app.use(flash());

// ===========================================
// 🚀 Attach basemiddleware after session and flash
// ===========================================
app.use(basemiddleware);
// ===========================================
// 🚀 Health Check Endpoint
// ===========================================
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

// ===========================================
// 🚀 Set up API Routes
// ===========================================
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/", cmsRoutes);
app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/profile", profileRoutes);
app.use("/chats", chatRoutes);
app.use("/ses", sesRoutes);
app.use("/ia", iaRoutes);
app.use("/sitemap", sitemapRoutes);
app.use("/whatsapp", whatsappRoutes);

// ===========================================
// 🚀 Error handling (404)
// ===========================================
app.use(function (req, res, next) {
  next(createError(404));
});

// ===========================================
// 🚀 Global Error handler
// ===========================================
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

// ===========================================
// 🚀 Connect to the Database
// ===========================================
dbConnection();

// ===========================================
// 🚀 Start the HTTP Server
// ===========================================
if (!process.env.PORT) {
  console.error("❌ No PORT environment variable defined. Exiting.");
  process.exit(1);
}

var port = process.env.PORT;
http.listen(port, () => {
  console.log(`✅ Server listening on port ${port}`);
});

// ===========================================
// 🚀 Export Express app
// ===========================================
module.exports = app;
