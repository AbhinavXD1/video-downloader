## SwiftGrab – Video Downloader

Modern, fast video downloader with a clean, intuitive UI.

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + ytdl-core + fluent-ffmpeg

Currently the backend is focused on **YouTube URLs**, but the architecture makes it easy to extend to other providers.

---

### 1. Prerequisites

- Node.js 18+ and npm
- FFmpeg installed on the server / local machine and available on the `PATH`
  - Verify with:

```bash
ffmpeg -version
```

---

### 2. Install dependencies

From the project root:

```bash
npm install
npm install --workspace server
npm install --workspace client
```

Or install separately inside `server` and `client`.

---

### 3. Run in development

In two separate terminals:

```bash
# Terminal 1 – backend
cd server
npm run dev

# Terminal 2 – frontend
cd client
npm run dev
```

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`
  - The Vite dev server proxies `/api` to `http://localhost:4000`.

---

### 4. Production build

Build both workspaces from the project root:

```bash
npm run build
```

This:

- Copies `server/src/index.js` to `server/dist/index.js`
- Builds the React app into `client/dist`

You can then:

```bash
cd server
npm start
```

And serve the static `client/dist` folder with any static file server or integrate it into the Node app (e.g., via `express.static`) if you prefer a single server.

---

### 5. API overview

- **POST** `/api/inspect`
  - **Body**: `{ "url": string }`
  - **Response**:
    - `title`: video title
    - `url`: normalized URL
    - `videoFormats`: list of MP4 video+audio formats (quality label, fps, approximate size)
    - `audioFormats`: list of audio-only formats (bitrate, quality)

- **GET** `/api/download?url=...&type=mp4|mp3&itag=...`
  - Streams the selected format directly as:
    - `video/mp4` (MP4)
    - `audio/mpeg` (MP3 via FFmpeg)

The frontend:

1. **Paste link → Analyze** (`/api/inspect`)
2. **Select format/resolution** (MP4 video or MP3 audio)
3. **Start download** (`/api/download`)

---

### 6. Notes & security

- The backend **only accepts YouTube hosts** by default:
  - `youtube.com`, `www.youtube.com`, `youtu.be`
- The server validates:
  - URL shape and host
  - That it is a valid YouTube video URL via `ytdl-core`
- For other providers:
  - Extend the `ALLOWED_HOSTS` list
  - Add provider-specific handlers

Ensure that your use of this tool complies with the terms of service and copyright laws in your jurisdiction.

