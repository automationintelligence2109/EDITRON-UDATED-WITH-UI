# 🛠️ EDITRON Design & Implementation Documentation

This document tracks the evolution of EDITRON from a standard web app to a premium, professional-grade editing suite.

## 🎨 Design Philosophy: "The Anti-AI Aesthetic"
To avoid the "generic AI tool" look, EDITRON follows three core principles:
1. **Precision over Glow**: Replacing generic gradients with high-contrast borders (1px), deep monochromatic depth, and structured grids.
2. **Progressive Disclosure**: Hiding complex settings until they are needed.
3. **Bespoke Interaction**: Using WebGL shaders and 3D transforms to create a "tactile" feel that feels human-crafted.

---

## 🚀 Phase 1: The Zero-State Experience (Completed)

### 1.1 Liquid Metal Branding
Implemented a high-end visual identity using WebGL fragments.
- **`LiquidMetalText`**: A 3D layered typography component. It uses a base shadow, a liquid shader mask, and a chrome highlight to create a polished metal effect.
- **`LiquidMetalButton`**: A 3D button with a liquid metal surface, physics-based ripples on click, and synchronized speed changes on hover.

### 1.2 The Welcome Gate
Replaced the landing page with a cinematic "Zero-State" entry point.
- **Focus**: Complete removal of marketing noise. The user only sees the brand and the upload action.
- **UX Flow**: `Welcome Screen` $\rightarrow$ `Video Upload` $\rightarrow$ `Studio Transition`.
- **Transition**: Used `framer-motion` for a blur-and-scale exit animation to make the entry into the studio feel seamless.

---

## 🏗️ Phase 2: The Pro-Studio Architecture (In Progress)

## 🏗️ Phase 2: The Pro-Studio Architecture (In Progress)

### 2.1 Three-Column Workspace (Implemented)
Moving from a vertical stack to a professional editing layout.
- **`StudioLayout` Component**: A full-screen application shell that removes the "website" feel.
- **Left Panel (Assets)**: Fixed sidebar for file management and the `AutoTrim` utility.
- **Center Panel (The Stage)**:
    - **Cinema Preview**: A centralized, high-contrast video player area.
    - **Linear Timeline**: A dedicated lower section for timeline visualization and playback control.
- **Right Panel (The Inspector)**: A unified, resizable area containing the `StylePanel` and `BrollPanel` for fine-tuning.

### 2.2 Technical Implementation
- **Resizable Grid**: Integrated `ResizablePanelGroup` from shadcn/ui to allow professional workspace customization.
- **Studio Header**: Added a minimal top bar for project naming and a high-contrast "Export" button.
- **Glassmorphism**: Applied `backdrop-blur-md` and `zinc-950` palettes to create depth and a "dark-studio" atmosphere.


---

## 🛠️ Technical Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Animation**: Framer Motion
- **Visuals**: `@paper-design/shaders` (WebGL)
- **Icons**: Lucide React
