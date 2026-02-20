import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// React build output (after you run: npm run build in /frontend)
const distPath = path.join(__dirname, "..", "frontend", "dist");

// Serve static files if dist exists
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Simple health check
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ✅ Express 5 fix: use regex instead of "*"
app.get(/.*/, (req, res) => {
  const indexHtml = path.join(distPath, "index.html");
  if (!fs.existsSync(indexHtml)) {
    return res
      .status(500)
      .send("Frontend build not found. Go to /frontend and run: npm install && npm run build");
  }
  res.sendFile(indexHtml);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
