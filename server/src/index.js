import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import { URL } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Allow only specific hosts for security. Extend as needed.
const ALLOWED_HOSTS = ["www.youtube.com", "youtube.com", "youtu.be"];

function validateVideoUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (!ALLOWED_HOSTS.includes(url.hostname)) {
      return { valid: false, reason: "Currently only YouTube URLs are supported." };
    }
    if (!ytdl.validateURL(rawUrl)) {
      return { valid: false, reason: "Invalid YouTube URL." };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "Invalid URL format." };
  }
}

/**
 * POST /api/inspect
 * Body: { url: string }
 * Returns basic metadata and available formats for selection in the UI.
 */
app.post("/api/inspect", async (req, res) => {
  const { url } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: "Missing url in request body." });
  }

  const validation = validateVideoUrl(url);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.reason });
  }

  try {
    const info = await ytdl.getInfo(url);

    const title = info.videoDetails.title;

    // Filter and map available video+audio formats (MP4)
    const videoFormats = ytdl
      .filterFormats(info.formats, "videoandaudio")
      .filter((f) => f.container === "mp4")
      .map((f) => ({
        itag: f.itag,
        qualityLabel: f.qualityLabel,
        bitrate: f.bitrate,
        fps: f.fps,
        sizeApprox: f.contentLength ? Number(f.contentLength) : undefined,
      }))
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    // Audio-only formats for MP3 conversion
    const audioFormats = ytdl
      .filterFormats(info.formats, "audioonly")
      .map((f) => ({
        itag: f.itag,
        bitrate: f.bitrate,
        audioQuality: f.audioQuality,
      }))
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    return res.json({
      title,
      url,
      videoFormats,
      audioFormats,
    });
  } catch (err) {
    console.error("Error inspecting URL:", err);
    return res.status(500).json({
      error: "Failed to fetch video information. The video may be unavailable or unsupported.",
    });
  }
});

/**
 * GET /api/download
 * Query: ?url=...&type=mp4|mp3&itag=...
 * Streams the requested format directly to the client.
 */
app.get("/api/download", async (req, res) => {
  const { url, type = "mp4", itag } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing url query parameter." });
  }

  const validation = validateVideoUrl(url);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.reason });
  }

  try {
    const info = await ytdl.getInfo(url);
    const titleSafe = info.videoDetails.title.replace(/[^\w\-]+/g, "_");

    if (type === "mp3") {
      // Audio-only stream -> FFmpeg -> MP3
      const audioStream = ytdl(url, {
        quality: itag ? itag : "highestaudio",
        filter: "audioonly",
      });

      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${titleSafe}.mp3"`
      );

      ffmpeg(audioStream)
        .format("mp3")
        .audioCodec("libmp3lame")
        .on("error", (err) => {
          console.error("FFmpeg error:", err);
          if (!res.headersSent) {
            res.status(500).end("Conversion failed.");
          } else {
            res.end();
          }
        })
        .pipe(res, { end: true });
    } else {
      // MP4 with video+audio
      const options = {
        quality: itag ? itag : "highest",
        filter: "videoandaudio",
      };

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${titleSafe}.mp4"`
      );

      const downloadStream = ytdl(url, options);

      downloadStream.on("error", (err) => {
        console.error("ytdl error:", err);
        if (!res.headersSent) {
          res.status(500).end("Download failed.");
        } else {
          res.end();
        }
      });

      downloadStream.pipe(res);
    }
  } catch (err) {
    console.error("Download error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Failed to start download." });
    }
    res.end();
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Video downloader API listening on port ${PORT}`);
  console.log(`Allowed hosts: ${ALLOWED_HOSTS.join(", ")}`);
});

