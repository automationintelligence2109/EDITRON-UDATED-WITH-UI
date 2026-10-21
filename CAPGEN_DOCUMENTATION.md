# 📘 CapGen: Comprehensive Technical & Functional Specification

## 1. Project Overview
CapGen is a professional-grade AI Caption Generator designed for "market-ready" short-form content (TikTok, Reels, Shorts). It transforms raw video/audio into high-engagement videos by combining automated transcription with a high-end visual engine that simulates professional editing software.

---

## 2. Core Engine Architecture
### A. Transcription & Timing
* **Backend**: Powered by `faster-whisper` for high-accuracy ASR (Automatic Speech Recognition).
* **Timing**: Implements word-level timestamps. This allows the tool to know exactly when each individual word is spoken, enabling the "Karaoke" highlighting effect.
* **Smart Splitting**: Logic that groups words into optimal segment lengths (typically 2–5 words) to mimic the fast-paced "viral" style of captions.

### B. Visual Rendering Engine
* **Live Preview**: Built with Next.js 16, Tailwind CSS 4, and Framer Motion. It uses a layered approach where a React overlay sits atop the HTML5 video element.
* **Burn-in Export**: Uses the HTML5 Canvas API. Because React animations cannot be "saved" into a video file, we built a manual interpolation engine that redraws the captions at 30fps onto a canvas, which is then captured via the MediaRecorder API.

---

## 3. Feature Deep-Dive

### 🎨 Visual Design & Typography
* **Dynamic Font Scaling**: Implemented a baseline scaling system where the font size is automatically calculated as 5% of the video width (e.g., 1080p video -> 54px). This ensures captions look consistent regardless of the video resolution.
* **Curated Font Catalog**: A categorized library divided into:
    * Viral: High-impact (e.g., Archivo Black, Anton).
    * Modern: Clean and professional (e.g., Inter, Montserrat).
    * Playful: Energetic (e.g., Bangers, Luckiest Guy).
    * Elegant/Tech: Sophisticated and mono-spaced options.
* **Cinematic Presets (Hyper-Styles)**: One-click visual themes (e.g., "MrBeast Style," "Hormozi Energy," "Cyber Neon") that instantly adjust colors, fonts, and animations to match famous creator styles.

### 🎬 Motion Doctrine (Animations)
We implemented a set of precise animation signatures for both live preview and burned-in export:
* Pop: A slight scale-up from 0.8 to 1.0.
* Slide: A vertical slide-in effect.
* Cascade: A smooth opacity fade.
* Bounce: An elastic overshoot effect using sine-wave interpolation.
* Zoom: An aggressive scale-up from near zero.
* Flip: A simulated 3D rotation on the X-axis.
* Blur: A Gaussian blur that clears as the caption appears.

### 🎙️ Audio Engineering
* **Clean Audio Pipeline**: A professional signal processing chain applied during export:
    * High-Pass Filter: Set at 90Hz to remove low-frequency rumble, wind noise, and AC hum.
    * Dynamics Compressor: Evens out the volume (threshold -28dB) so quiet speech is audible and loud peaks don't clip.
    * Makeup Gain: A slight boost (1.15x) to restore loudness lost during compression.

### 🤖 Intelligence Features
* **Auto-Emoji Injection**: A rule-based dictionary system that analyzes text and injects contextual emojis (e.g., "money" -> 💰) without the cost or latency of an LLM.
* **AI Hook Title**: An API-driven feature that analyzes the first few segments of a transcript to generate a high-retention "Hook" title displayed in a callout box.
* **B-Roll Integration**: The ability to overlay stock footage clips at specific timestamps, with an object-fit: cover implementation to prevent warping of landscape footage in vertical videos.

---

## 4. Evolution & Changes (What we added/fixed)

| Feature/Issue | Original State | Final Implementation |
| :--- | :--- | :--- |
| Export Quality | Static resolution | Selectable 480p, 720p, 1080p exports. |
| Visual Warping | B-roll stretched to fit | Implemented drawCover for professional cropping. |
| Blinking Captions | Captions flickered on change | Switched AnimatePresence to popLayout mode. |
| CPU Usage | setInterval render loop | Switched to requestAnimationFrame for 60fps. |
| Karaoke Effect | Static block of text | Per-word highlighting based on WordTimestamp array. |
| Audio Quality | Raw audio output | High-pass filter + Dynamics Compression. |
| Font Sizing | Fixed pixel size | Adaptive scaling based on video width. |

---

## 5. Workflow Summary
1. Input: User uploads media -> faster-whisper generates word-level timestamps.
2. Styling: User applies Cinematic Styles -> Motion Doctrine animations -> Auto-Emojis.
3. Refining: User edits text inline or uses AI Hook Title.
4. Export: The system renders the video -> applies Clean Audio -> captures Canvas via MediaRecorder -> outputs a burned-in .webm/.mp4 file.
