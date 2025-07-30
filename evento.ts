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

import { allowedOrigins, corsOptions } from "./config/corsConfig";
import dbConnection from "./config/dbConnection";
import basemiddleware from "./middleware/basemiddleware";
import mainRouter from "./routes";
import stripeRoutesForWebhook from "./routes/stripeRoutesForWebhook";

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

// Attach Socket.IO to req
interface IRequest extends Request {
  io: SocketIOServer;
}
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as IRequest).io = io;
  next();
});

// ===========================================
// ✅ Stripe Webhook DOIT être monté AVANT tout parsing JSON
// ===========================================
// Ici express.raw est géré directement dans stripeRoutes
app.use("/stripe-webhook", stripeRoutesForWebhook);

// ===========================================
// 🛡️ CORS (doit venir tôt mais après Stripe webhook)
// ===========================================
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, origin);
      } else {
        cb(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options("*", cors(corsOptions));

// ===========================================
// ⚙️ Middleware global pour toutes les autres routes
// ===========================================
app.use(logger("dev"));

// Ces parseurs NE DOIVENT PAS être appliqués avant le webhook
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
// 🧾 Routes classiques
// ===========================================
app.get("/healthz", (_req, res, next) => {
  res.status(200).send("OK");
  next();
});

// Redirection racine
app.use((req, res, next) =>
  req.url === "/" ? res.redirect("/login") : next(),
);

app.use("/", mainRouter);

// ===========================================
// 🔌 Socket.IO
// ===========================================
require("./socket/socketHandlers")(io);

// ===========================================
// ❌ Error Handling
// ===========================================
app.use((req, _res, next) => next(createError(404)));

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error("🔥 Global error:", err.stack || err.message);

  if (req.headers.accept?.includes("application/json")) {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Unhandled error" });
  } else {
    res.status(err.status || 500);
    res.render("error", {
      message: err.message,
      error: process.env.NODE_ENV === "development" ? err : {},
    });
  }
});

// ===========================================
// 🚀 Launch
// ===========================================
dbConnection();
const port = process.env.PORT || 8080;
httpServer.listen(port, () => {
  console.log(`✅ Server listening on port ${port}`);
});
