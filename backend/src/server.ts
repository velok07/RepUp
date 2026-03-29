import app from "./app";

const PORT = Number(process.env.PORT) || 4000;
const HOST = "0.0.0.0";

process.on("SIGTERM", () => {
  console.log("Received SIGTERM");
});

process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});

app.listen(PORT, HOST, () => {
  console.log(`RepUp backend running on http://${HOST}:${PORT}`);
});