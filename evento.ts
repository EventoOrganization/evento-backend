// ===========================================
// 🚀 Core Setup
// ===========================================
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import expressLayouts from "express-ejs-layouts";
import fileUpload from "express-fileupload";
import flash from "express-flash";
import session from "express-session";
import http from "http";
import createError from "http-errors";
import logger from "morgan";
import path from "path";
import { Server as SocketIOServer } from "socket.io";
import { corsOptions } from "./config/corsConfig";
import dbConnection from "./config/dbConnection";
import basemiddleware from "./middleware/basemiddleware";
import mainRouter from "./routes";
import stripeRoutes from "./routes/stripeRoutes";

// ===========================================
// 🚀 App + HTTP + Socket.IO
// ===========================================
dotenv.config();
const app = express();
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOptions.origin,
    credentials: corsOptions.credentials,
    methods: ["GET", "POST"],
  },
});

// Attach Socket.IO to requests
interface IRequest extends Request {
  io: SocketIOServer;
}

app.use((req: Request, res: Response, next: NextFunction) => {
  (req as IRequest).io = io;
  next();
});

app.use("/stripe", stripeRoutes);

// ===========================================
// 🚀 Middleware Config
// ===========================================
app.use(logger("dev"));
app.use(express.json());
app.use(express.text({ type: "text/plain" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static(path.join(__dirname, "public")));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "./layout/admin_layout");

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.set("trust proxy", 1);

app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
    cookie: {
      maxAge: 365 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);
app.use(flash());
app.use(basemiddleware);

// ===========================================
// 🚀 Routes
// ===========================================
app.get("/healthz", (_req, res) => {
  res.status(200).send("OK");
});

app.use((req, res, next) =>
  req.url === "/" ? res.redirect("/login") : next(),
);

app.use(mainRouter);

// ===========================================
// 🚀 Socket.IO
// ===========================================
require("./socket/socketHandlers")(io);

// ===========================================
// 🚀 Errors
// ===========================================
app.use((req, _res, next) => next(createError(404)));

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error("🔥 Global error:", err.stack || err.message);
  res.status(err.status || 500);
  res.render("error", {
    message: err.message,
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ message: err.message || "Unhandled error" });
});

// ===========================================
// 🚀 Launch
// ===========================================
dbConnection();
const port = process.env.PORT;
if (!port) {
  console.error("❌ No PORT defined. Exiting.");
  process.exit(1);
}

httpServer.listen(port, () => {
  console.log(`✅ Server listening on port ${port}`);
});
