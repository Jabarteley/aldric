import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import analysisRoutes from "./routes/analysisRoutes.js";
import fundamentalsRoutes from "./routes/fundamentalsRoutes.js";
import marketRoutes from "./routes/marketRoutes.js";
import mt4Routes from "./routes/mt4Routes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import signalRoutes from "./routes/signalRoutes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    name: "Aldric AI Trading Assistant API",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/market", marketRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/fundamentals", fundamentalsRoutes);
app.use("/api/mt4", mt4Routes);
app.use("/api/settings", settingsRoutes);
app.use("/api/signals", signalRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((error, _req, res, _next) => {
  if (error.status && error.status < 500) {
    console.warn(error.message);
  } else if (error.status === 502) {
    console.warn(error.message);
  } else {
    console.error(error);
  }
  res.status(error.status || 500).json({
    message: error.message || "Internal server error."
  });
});

app.listen(port, () => {
  console.log(`Aldric API running on port ${port}`);
});
