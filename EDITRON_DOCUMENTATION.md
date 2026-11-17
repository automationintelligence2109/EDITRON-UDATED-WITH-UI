# 📘 Editron: Comprehensive Technical & Functional Specification

## 1. Project Overview
Editron is a professional-grade AI Caption Generator designed for "market-ready" short-form content (TikTok, Reels, Shorts). It transforms raw video/audio into high-engagement videos by combining automated transcription with a high-end visual engine that simulates professional editing software.

---

## 2. Core Engine Architecture
### A. Transcription & Timing
* **Backend**: The Python/FFmpeg cut engine prepares the media, then Replicate Whisper provides speech recognition.
* **Timing**: Implements word-level timestamps to align caption segments and Premium Studio word effects with speech.
* **Smart Splitting**: Logic that groups words into optimal segment lengths (typically 2–5 words) to mimic the fast-paced "viral" style of captions.

### B. Visual Rendering Engine
* **Live Preview**: Built with Next.js 16 and Tailwind CSS 4. A React overlay sits atop the HTML5 video element.
* **Burn-in Export**: Uses the HTML5 Canvas API to redraw captions at 30fps, then captures the canvas via the MediaRecorder API.

---

## 3. Feature Deep-Dive

### 🎨 Visual Design & Typography
* **Caption Defaults**: New media starts with a moderate 24px caption size, centered horizontally at 85% of the frame height for a professional lower-screen placement. Users can adjust the size and position manually; preview and export scale the caption together.
* **Premium Studio Presets**: Editorial Luxe, Apple Glass Pill, Cinema Blur, Podcast Karaoke, and Minimalist Underline use word-level timestamps for active-word styling and motion. The same timing data drives the live preview and canvas export.
* **Curated Font Catalog**: A categorized library divided into:
    * Viral: High-impact (e.g., Archivo Black, Anton).
    * Modern: Clean and professional (e.g., Inter, Montserrat).
    * Playful: Energetic (e.g., Bangers, Luckiest Guy).
    * Elegant/Tech: Sophisticated and mono-spaced options.
* **Templates**: One-click visual themes (e.g., "MrBeast Style," "Hormozi Energy," "Cyber Neon") adjust colors, fonts, and other visual properties. Premium Studio templates additionally include word-timed visual treatments.

### 🎙️ Audio Engineering
* **Clean Audio Pipeline**: A professional signal processing chain applied during export:
    * High-Pass Filter: Set at 90Hz to remove low-frequency rumble, wind noise, and AC hum.
    * Dynamics Compressor: Evens out the volume (threshold -28dB) so quiet speech is audible and loud peaks don't clip.
    * Makeup Gain: A slight boost (1.15x) to restore loudness lost during compression.

### 🤖 Intelligence Features
* **Auto-Emoji Injection**: A rule-based dictionary system that analyzes text and injects contextual emojis (e.g., "money" -> 💰) without the cost or latency of an LLM.
* **AI Hook Title**: An API-driven feature that analyzes the first few segments of a transcript to generate a high-retention "Hook" title displayed in a callout box.
* **B-Roll Integration**: Stock footage clips are placed at specific timestamps with object-fit: cover. Each clip gets distinct opening and closing effects from a persisted round-robin cycle, using every available effect before repeating. Changing clip timing preserves its effect assignments. A saved-project toggle enables or disables transition effects in both the live preview and canvas export. The 33 MP4 effects in `public/transitions` are screen-blended over the footage without an additional opacity fade. Uploaded video trims and still images are preserved in saved projects and included in preview and export. Long transcript searches are spread across the timeline and sent in API-sized batches; if clips overlap, the most recently started clip takes priority.

---

## 4. Evolution & Changes (What we added/fixed)

| Feature/Issue | Original State | Final Implementation |
| :--- | :--- | :--- |
| Export Quality | Static resolution | Browser export supports 480p, 720p, 1080p, and 4K, fitting the source aspect ratio within the selected resolution. Lower-resolution sources can be upscaled. The browser selects MP4 or WebM based on available encoders; 4K requires substantial device resources. |
| Visual Warping | B-roll stretched to fit | Implemented drawCover for professional cropping. |
| Blinking Captions | Captions flickered on change | Switched AnimatePresence to popLayout mode. |
| CPU Usage | setInterval render loop | Switched to requestAnimationFrame for 60fps. |
| Word Timing | Caption segments without word timing | Word-level timestamps support speech alignment; captions render as styled segments. |
| Audio Quality | Raw audio output | High-pass filter + Dynamics Compression. |
| Font Sizing | Fixed pixel size | Adaptive scaling based on video width. |

---

## 5. Workflow Summary
1. Input: An authenticated user uploads media -> the Python/FFmpeg cut engine prepares it -> Replicate Whisper returns speech timings.
2. Styling: Auto-emojis are added during transcription; users can apply caption templates and edit the result.
3. Refining: User edits text inline or uses AI Hook Title.
4. Export: The system renders the video -> applies Clean Audio -> captures Canvas via MediaRecorder -> outputs a burned-in .webm/.mp4 file.

Caption segments can be hidden and restored without cutting video or audio. Hidden captions are excluded from preview and exports and saved with the project. Changing words per caption regroups the current edited captions immediately without retranscribing; edited text, emoji, hidden status, and B-roll assignments remain. Caption boundaries may be shorter than the selected maximum to preserve hidden sections or B-roll attachments. Where edited text no longer matches word timestamps, timing is distributed across the original caption interval. Unsaved work prompts for confirmation before replacing a file or navigating away, and a failed project save can be retried from the editor.

## 6. Current Server Limits
* Sign-in is temporarily disabled with `AUTH_ENABLED=false`; existing Google OAuth code remains in place and can be re-enabled by setting both `AUTH_ENABLED=true` and `NEXT_PUBLIC_AUTH_ENABLED=true` with valid Google credentials.
* While sign-in is off, each browser receives a signed guest-workspace cookie. Projects are private to that browser cookie, are not synced across devices, and clearing browser cookies loses access to that workspace. Public guest access can still be abused, so use rate limits and monitor usage.
* Refresh restores the current workspace page and the last cloud-saved project in that tab. Uploads, processing jobs and unsaved edits cannot be restored; the browser warns before leaving while work is unsaved. Project recovery requires a working PostgreSQL configuration.
* Transcription accepts files up to 150 MB and media up to 30 minutes.
* In local development only, when login is off and PostgreSQL or Redis is not configured, transcription uses a process-local job store and rate limiter. Jobs are lost if the dev server restarts, and this fallback is never used in production.
* Transcription jobs are stored in PostgreSQL and queued in Redis. A separate worker runs the Python/FFmpeg and Replicate processing pipeline; set `TRANSCRIPTION_WORKER_CONCURRENCY` to configure the worker (default: one job at a time).
* Replicate prediction rate limits are retried with a delay based on the provider's response. If the limit persists, users see a temporary service-busy message rather than a generic processing error.
* The default is five transcription requests per authenticated user per hour. Rate limits are stored in Redis and shared across app instances.
* B-roll uploads are limited to 50 MB and ten uploads per authenticated user per hour. B-roll search is limited to ten requests per minute per user.
* User-uploaded B-roll is stored in the user's Cloudflare R2 prefix. Signed media URLs are refreshed when a saved project is opened.
* Browser export streams the processed source and uploaded B-roll through an authenticated same-origin endpoint, so cloud media can be drawn on the canvas without relying on bucket CORS settings. The endpoint supports byte-range requests for video seeking.
* If a browser encoder fails during export, the browser retries with another supported format. The result may be WebM rather than MP4; 4K recording can still exceed device or browser capabilities.
* Configure `DATABASE_URL` for PostgreSQL and `REDIS_URL` for Redis in both web and worker environments. Run `npm run db:migrate:deploy` before starting the application, and run `npm run worker:transcribe` as a separate long-running service.
* Uploads are accepted by the web process before the queued worker starts, so the web tier still needs adequate request-body limits and temporary capacity. For very large traffic, direct-to-object-storage uploads are a further improvement.
* Existing SQLite records are not automatically copied to PostgreSQL. Export/migrate any existing account and project data before switching a populated deployment.
