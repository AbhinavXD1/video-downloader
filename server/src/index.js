import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { URL } from "url";
import https from "https";
import http from "http";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Allow only X (Twitter) and Reddit hosts
const ALLOWED_HOSTS = [
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "www.x.com",
  "mobile.twitter.com",
  "mobile.x.com",
  "reddit.com",
  "www.reddit.com",
  "v.redd.it",
];

function validateVideoUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();
    
    // Check if hostname matches allowed hosts (including subdomains)
    const isAllowed = ALLOWED_HOSTS.some((allowed) => {
      return hostname === allowed || hostname.endsWith(`.${allowed}`);
    });
    
    if (!isAllowed) {
      return { valid: false, reason: "Only X (Twitter) and Reddit video links are supported." };
    }
    
    // Basic URL structure validation
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      // X/Twitter URLs should contain /status/ or similar patterns
      if (!url.pathname.match(/\/(status|i)\//)) {
        return { valid: false, reason: "Invalid X (Twitter) video link." };
      }
    } else if (hostname.includes("reddit.com")) {
      // Reddit URLs should be post links
      if (!url.pathname.match(/\/r\/\w+\/.*/)) {
        return { valid: false, reason: "Invalid Reddit post link." };
      }
    }
    
    return { valid: true };
  } catch {
    return { valid: false, reason: "Invalid URL format." };
  }
}

/**
 * Helper to fetch JSON from a URL
 */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, { headers: { "User-Agent": "QuickXSave/1.0" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error("Invalid JSON response"));
          }
        });
      })
      .on("error", reject);
  });
}

/**
 * Extract video URL from Reddit post
 */
async function extractRedditVideo(url) {
  try {
    const jsonUrl = url.endsWith("/") ? `${url}.json` : `${url}/.json`;
    const data = await fetchJSON(jsonUrl);
    
    if (Array.isArray(data) && data[0]?.data?.children?.[0]?.data) {
      const post = data[0].data.children[0].data;
      const videoUrl = post?.media?.reddit_video?.fallback_url || 
                       post?.secure_media?.reddit_video?.fallback_url;
      
      if (videoUrl) {
        return {
          title: post.title || "Reddit Video",
          videoUrl: videoUrl.replace("?source=fallback", ""),
        };
      }
    }
    return null;
  } catch (err) {
    console.error("Reddit extraction error:", err);
    return null;
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
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    let title = "Video";
    let videoUrl = null;
    
    if (hostname.includes("reddit.com")) {
      const result = await extractRedditVideo(url);
      if (result) {
        title = result.title;
        videoUrl = result.videoUrl;
      } else {
        return res.status(400).json({
          error: "Could not find video in this Reddit post. Make sure it's a public post with a video.",
        });
      }
    } else if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      title = "X (Twitter) Video";
      videoUrl = url;
    }

    return res.json({
      title,
      url,
      videoFormats: videoUrl ? [{ itag: "default", qualityLabel: "Default", directUrl: videoUrl }] : [],
      audioFormats: [],
    });
  } catch (err) {
    console.error("Error inspecting URL:", err);
    return res.status(500).json({
      error: "Unable to process this link. Make sure it's a public X or Reddit video post.",
    });
  }
});

/**
 * GET /api/download
 * Query: ?url=...&type=mp4|mp3&itag=...
 * Redirects to direct video URL or streams the video.
 */
app.get("/api/download", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing url query parameter." });
  }

  const validation = validateVideoUrl(url);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.reason });
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    let videoUrl = null;
    
    if (hostname.includes("reddit.com")) {
      const result = await extractRedditVideo(url);
      if (result) {
        videoUrl = result.videoUrl;
      } else {
        return res.status(400).json({
          error: "Could not find video in this Reddit post.",
        });
      }
    } else if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      return res.status(400).json({
        error: "X (Twitter) video extraction requires additional setup. Please use a dedicated X video downloader.",
      });
    }

    if (!videoUrl) {
      return res.status(400).json({ error: "Could not extract video URL." });
    }

    res.redirect(videoUrl);
  } catch (err) {
    console.error("Download error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Failed to process download." });
    }
    res.end();
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`QuickXSave API listening on port ${PORT}`);
  console.log(`Supported platforms: X (Twitter) and Reddit`);
});
