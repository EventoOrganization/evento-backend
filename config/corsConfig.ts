export const allowedOrigins = [
  "https://www.evento-app.io",
  "https://evento-app.io",
  "https://staging.evento-app.io",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://backend.evento-app.io",
  "http://localhost:8747",
];

export const corsOptions = {
  origin: (origin: string | undefined, callback: any) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};
