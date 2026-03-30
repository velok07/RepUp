import "dotenv/config";
import cors from "cors";
import express from "express";
import authRoutes from "./routes/auth";
import meRoutes from "./routes/me";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/auth", authRoutes);
app.use("/me", meRoutes);

export default app;
