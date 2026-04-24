import "dotenv/config";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { getEmotion } from "./getEmotion.js";
import { processUserVibe } from "./processUserVibe.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.post("/api/emotion", async (req: Request, res: Response) => {
  const text = String(req.body?.text ?? "").trim();
  const requestTime = new Date().toISOString();

  if (!text) {
    console.warn(`[${requestTime}] /api/emotion rejected: empty text`);
    res.status(400).json({ error: "text is required" });
    return;
  }

  try {
    console.log(`[${requestTime}] /api/emotion input: ${text}`);
    const emotions = await getEmotion(text);
    const preview = emotions
      .slice(0, 3)
      .map((item) => `${item.emotion}:${item.score}`)
      .join(", ");
    console.log(`[${requestTime}] /api/emotion output (top 3): ${preview}`);
    res.json({ emotions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[${requestTime}] /api/emotion failed: ${message}`);
    res.status(500).json({ error: message });
  }
});

app.post("/api/process-vibe", async (req: Request, res: Response) => {
  const text = String(req.body?.text ?? "").trim();
  const requestTime = new Date().toISOString();

  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  try {
    console.log(`[${requestTime}] /api/process-vibe input: ${text}`);
    const artworks = await processUserVibe(text);
    console.log(`[${requestTime}] /api/process-vibe returned ${artworks.length} artworks`);
    res.json({ artworks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[${requestTime}] /api/process-vibe failed: ${message}`);
    res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
