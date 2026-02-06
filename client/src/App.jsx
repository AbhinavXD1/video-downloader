import React, { useState } from "react";
import axios from "axios";

const API_BASE = "https://video-downloader-server-production-b73d.up.railway.app";

const INITIAL_STATE = {
  url: "",
  loadingInspect: false,
  loadingDownload: false,
  error: "",
  meta: null,
  selectedType: "mp4",
  selectedItag: "",
};

function formatBytes(bytes) {
  if (!bytes || Number.isNaN(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

function App() {
  const [state, setState] = useState(INITIAL_STATE);

  const handleUrlChange = (e) => {
    setState((s) => ({
      ...s,
      url: e.target.value,
      error: "",
    }));
  };

  const handleInspect = async (e) => {
    e.preventDefault();
    if (!state.url.trim()) {
      setState((s) => ({ ...s, error: "Please paste a video URL." }));
      return;
    }

    setState((s) => ({
      ...s,
      loadingInspect: true,
      error: "",
      meta: null,
      selectedItag: "",
    }));

    try {
      const res = await axios.post(`${API_BASE}/api/inspect`, {
        url: state.url.trim(),
      });
      const { data } = res;

      const defaultVideoItag = data.videoFormats?.[0]?.itag ?? "";
      const defaultAudioItag = data.audioFormats?.[0]?.itag ?? "";

      setState((s) => ({
        ...s,
        loadingInspect: false,
        meta: data,
        selectedType: "mp4",
        selectedItag: defaultVideoItag || defaultAudioItag || "",
      }));
    } catch (err) {
      const message =
        err.response?.data?.error ??
        "Unable to fetch video information. Please check the link and try again.";
      setState((s) => ({
        ...s,
        loadingInspect: false,
        error: message,
      }));
    }
  };

  const handleTypeChange = (type) => {
    setState((s) => {
      if (!s.meta) return s;
      const formats =
        type === "mp4" ? s.meta.videoFormats ?? [] : s.meta.audioFormats ?? [];
      const firstItag = formats[0]?.itag ?? "";
      return {
        ...s,
        selectedType: type,
        selectedItag: firstItag,
      };
    });
  };

  const handleSelectChange = (e) => {
    setState((s) => ({
      ...s,
      selectedItag: e.target.value,
    }));
  };

  const handleDownload = async () => {
    if (!state.meta || !state.selectedItag) {
      setState((s) => ({
        ...s,
        error: "Please select a format to download.",
      }));
      return;
    }

    setState((s) => ({
      ...s,
      loadingDownload: true,
      error: "",
    }));

    try {
      const params = new URLSearchParams({
        url: state.meta.url,
        type: state.selectedType,
        itag: state.selectedItag.toString(),
      });

      // Navigate to the download endpoint so the browser handles the file save dialog.
      window.location.href = `${API_BASE}/api/download?${params.toString()}`;

      setTimeout(() => {
        setState((s) => ({
          ...s,
          loadingDownload: false,
        }));
      }, 1000);
    } catch {
      setState((s) => ({
        ...s,
        loadingDownload: false,
        error: "Failed to start download. Please try again.",
      }));
    }
  };

  const { url, loadingInspect, loadingDownload, error, meta, selectedType, selectedItag } =
    state;

  const videoOptions = meta?.videoFormats ?? [];
  const audioOptions = meta?.audioFormats ?? [];

  const showFormats = Boolean(meta);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100 flex flex-col">
      <header className="w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              ↓
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                SwiftGrab
              </h1>
              <p className="text-xs text-slate-400">
                Paste a link, pick a format, download.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline text-xs text-slate-400">
            No signup. Runs in your browser + server.
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="w-full max-w-3xl mx-auto px-4 py-10">
          <section
            aria-label="Video downloader"
            className="bg-surface/5 border border-slate-800/80 rounded-2xl shadow-[0_18px_60px_rgba(15,23,42,0.85)] p-6 sm:p-8 backdrop-blur"
          >
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Download videos in seconds
              </h2>
              <p className="text-sm text-slate-400">
                Paste any public YouTube URL. Choose MP4 video or MP3 audio in
                your preferred quality.
              </p>
            </div>

            <form
              onSubmit={handleInspect}
              className="space-y-4"
              aria-label="Paste link and inspect formats"
            >
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Video URL
                <span className="sr-only">Paste a public YouTube link</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500 text-xs sm:text-sm">
                    https://
                  </span>
                  <input
                    id="video-url"
                    name="video-url"
                    type="url"
                    inputMode="url"
                    required
                    value={url}
                    onChange={handleUrlChange}
                    placeholder="Paste link from YouTube"
                    className="w-full pl-16 pr-3 py-3 rounded-xl border border-slate-700 bg-slate-900/60 text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 transition-shadow"
                    aria-describedby={error ? "url-error" : undefined}
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm sm:text-base font-medium shadow-lg shadow-blue-500/30 hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={loadingInspect}
                >
                  {loadingInspect ? (
                    <>
                      <span className="h-4 w-4 mr-2 rounded-full border-2 border-slate-200 border-t-transparent animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    "Download"
                  )}
                </button>
              </div>
            </form>

            {error && (
              <p
                id="url-error"
                className="mt-3 text-sm text-rose-400"
                role="alert"
              >
                {error}
              </p>
            )}

            {showFormats && (
              <div className="mt-8 space-y-5" aria-live="polite">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-300 font-medium truncate">
                      {meta.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      Formats detected:{" "}
                      <span className="font-mono">
                        {videoOptions.length} video
                      </span>{" "}
                      ·{" "}
                      <span className="font-mono">
                        {audioOptions.length} audio
                      </span>
                    </p>
                  </div>
                  <div className="inline-flex rounded-full border border-slate-700 bg-slate-900/60 p-1 text-xs sm:text-sm">
                    <button
                      type="button"
                      onClick={() => handleTypeChange("mp4")}
                      className={`px-3 py-1.5 rounded-full transition-colors ${
                        selectedType === "mp4"
                          ? "bg-primary text-primary-foreground"
                          : "text-slate-300 hover:bg-slate-800/80"
                      }`}
                      aria-pressed={selectedType === "mp4"}
                    >
                      MP4 Video
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange("mp3")}
                      className={`px-3 py-1.5 rounded-full transition-colors ${
                        selectedType === "mp3"
                          ? "bg-primary text-primary-foreground"
                          : "text-slate-300 hover:bg-slate-800/80"
                      }`}
                      aria-pressed={selectedType === "mp3"}
                    >
                      MP3 Audio
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4 items-end">
                  <div className="space-y-2">
                    <label
                      htmlFor="format-select"
                      className="block text-xs font-medium uppercase tracking-wide text-slate-400"
                    >
                      {selectedType === "mp4"
                        ? "Resolution & quality"
                        : "Audio quality"}
                    </label>
                    <div className="relative">
                      <select
                        id="format-select"
                        value={selectedItag}
                        onChange={handleSelectChange}
                        className="block w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 pr-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                      >
                        {(selectedType === "mp4"
                          ? videoOptions
                          : audioOptions
                        ).map((f) => (
                          <option key={f.itag} value={f.itag}>
                            {selectedType === "mp4"
                              ? `${f.qualityLabel || "Unknown"} · ${
                                  f.fps ? `${f.fps} fps · ` : ""
                                }${formatBytes(f.sizeApprox)}`
                              : `${f.audioQuality || "Audio"} · ${
                                  f.bitrate
                                    ? `${Math.round(f.bitrate / 1000)} kbps`
                                    : "Unknown bitrate"
                                }`}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 text-xs">
                        ▼
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      We’ll stream directly from the source. Downloads may be
                      slower on very long videos.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={loadingDownload}
                    className="inline-flex items-center justify-center w-full rounded-xl bg-primary text-primary-foreground text-sm font-medium px-4 py-3 shadow-lg shadow-blue-500/30 hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingDownload ? (
                      <>
                        <span className="h-4 w-4 mr-2 rounded-full border-2 border-slate-200 border-t-transparent animate-spin" />
                        Preparing download…
                      </>
                    ) : (
                      <>
                        Start download
                        <span className="ml-2 text-lg leading-none">↓</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {!meta && !loadingInspect && !error && (
              <p className="mt-5 text-xs text-slate-500">
                Tip: You can paste directly from your clipboard and press Enter
                to fetch formats.
              </p>
            )}
          </section>

          <section className="mt-8 text-xs text-slate-500 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <p>
              Built with React, Tailwind CSS, and a Node.js backend. Keyboard
              friendly and screen-reader aware.
            </p>
            <p className="text-[11px]">
              Make sure downloading from the source complies with its terms of
              service in your region.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;

