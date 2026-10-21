# 🎬 EDITRON AI Video Suite
**EDITRON** is an end-to-end AI video editing tool designed to automate the tedious parts of video production. It combines AI-powered speech-to-text transcription, intelligent silence removal, and a high-performance rendering engine to create professional captioned videos with B-roll overlays automatically.

## 🌟 Key Features
- **AI Transcription:** Uses `faster-whisper` to generate word-level timed captions from audio/video.
- **⚡ AI Silence Removal (Auto-Trim):** Automatically detects dead air and silences using `ffmpeg silencedetect`, allowing for "jump-cut" style editing that keeps the video fast-paced.
- **Auto-Captioning:** Converts speech into SRT files and overlays them onto video with customizable styles.
- **Hyper-Engine Rendering:** A powerful FFmpeg-based pipeline that handles B-roll cutaways, scaling, cropping, and audio enhancement.
- **Modern Dashboard:** A Next.js frontend for managing projects, editing compositions, and previewing renders.
- **Audio Enhancement:** Integration with `deepfilternet` for professional-grade noise reduction.

---

## 🛠 Tech Stack
### **Frontend**
- **Framework:** Next.js 16 / React 19
- **Styling:** Tailwind CSS 4 / Framer Motion
- **State Management:** Zustand / TanStack Query
- **UI Components:** Radix UI / Lucide React

### **Backend & AI Services**
- **Whisper Service:** Python Flask + `faster-whisper` (AI Transcription)
- **Cut Engine:** Python + FFmpeg (Silence Detection & Auto-Trimming)
- **Hyper-Engine:** Python + FFmpeg (Video Rendering)
- **Database:** Prisma (ORM)
- **Runtime:** Bun / Node.js

---

## 📦 Installation & Setup

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Node.js** (v20+) or **Bun**
- **Python 3.11+**
- **FFmpeg** (Crucial: Must be installed and added to your System PATH)
- **Git**

### 2. Backend Setup (Whisper & Hyper-Engine)
Navigate to the mini-services and set up the Python environment:
```bash
# Setup Whisper Service
cd mini-services/whisper-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
# Return to root directory
cd ../..
npm install
npx prisma generate
npm run dev
```

### 4. Environment Configuration
Create a `.env` file in the root directory and add your configurations:
```env
DATABASE_URL="your_prisma_database_url"
WHISPER_MODEL_SIZE="tiny" # options: tiny, base, small, medium, large-v3
WHISPER_BEAM_SIZE="3"
```

---

## 🚀 Running the Application

### The Easy Way (Windows)
Simply double-click the `start_all.bat` file in the root directory. This script will:
1. Launch the **Whisper AI Service** (Port 5001)
2. Launch the **Next.js Frontend** (Port 3000)
3. Open your project folder automatically.

### The Manual Way
- **Frontend:** `npm run dev`
- **AI Service:** `cd mini-services/whisper-service && python app.py`

---

## 🏗 System Architecture

### **Data Flow**
1. **Upload:** User uploads video via the EDITRON Dashboard.
2. **Transcription:** The `whisper-service` processes the audio, generates word-level timestamps, and creates an `.srt` file.
3. **Auto-Trim:** The **Cut Engine** (`silence.py`) analyzes the audio for silences and calculates "snapped" timestamps to remove dead air without clipping words.
4. **Editing:** The user manages "B-roll" clips and adjusts caption styles in the UI.
5. **Rendering:** The `hyper-engine` takes the source video, the silence-removal cuts, the B-roll data, and the captions, then renders the final `.mp4`.

### **API Endpoints (Whisper Service)**
- `POST /transcribe`: Generates timed captions from a file.
- `POST /upload_media`: Saves media for playback in the dashboard.
- `GET /download/<srt_id>`: Downloads the generated caption file.

---

## 🛠 Developer Notes
- **Silence Removal:** The `detect_silences` function uses `silencedetect` with a default noise threshold of `-35dB` and minimum duration of `0.25s`.
- **Render Pipeline:** The rendering logic is located in `mini-services/hyper-engine/renderer.py`. It uses `libx264` for video and `aac` for audio.
- **Scaling:** B-roll clips are automatically scaled and cropped to match the source video resolution using the `force_original_aspect_ratio=increase` filter.
- **Transcription:** The service is optimized for CPU using `int8` quantization via `faster-whisper`.
