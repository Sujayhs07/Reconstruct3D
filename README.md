# Reconstruct3D

> **An End-to-End Photogrammetry & 3D Reconstruction Platform** powered by **FastAPI**, **Three.js**, **OpenCV**, **Open3D**, and **React 19**.

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black.svg)](https://threejs.org/)
[![OpenCV](https://img.shields.io/badge/OpenCV-Computer%20Vision-5C3EE8.svg)](https://opencv.org/)
[![Open3D](https://img.shields.io/badge/Open3D-3D%20Processing-lightgrey.svg)](http://www.open3d.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
  - [3. Running Tests](#3-running-tests)
- [Deployment Guide (Render)](#deployment-guide-render)
  - [Option A: Unified Full-Stack Service (Recommended)](#option-a-unified-full-stack-service-recommended)
  - [Option B: Split Deployment (Vercel Frontend + Render Backend)](#option-b-split-deployment-vercel-frontend--render-backend)
- [API Reference](#api-reference)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [License](#license)

---

## Overview

**Reconstruct3D** transforms collections of 2D photographs into solid, textured, and interactive 3D digital models. Built with a dual-engine architecture, it caters both to resource-constrained environments (such as free-tier cloud containers and low-spec laptops) and high-fidelity photogrammetry workflows:

1. **Local Pure-CPU Visual Hull Engine**: Synthesizes watertight 3D models and point clouds using multi-view silhouette analysis, adaptive CLAHE contrast, and direct UV texture projection in seconds with zero external dependencies.
2. **Cloud AI 3D Engine**: Integrates Hugging Face open-source spaces (TripoSR / Image-to-3D) and Meshy.ai to synthesize production-ready PBR textured 3D meshes from photographs.
3. **Traditional Photogrammetry Pipeline**: Full Structure-from-Motion (SfM), Multi-View Stereo (MVS), and Poisson Surface Reconstruction using COLMAP and Open3D.

---

## Key Features

- **Interactive 3D Web Viewer (WebGL)**:
  - Inspect dense point clouds and textured polygon meshes directly in the browser at 60 FPS using **Three.js** and **React Three Fiber**.
  - Supports Stanford PLY point clouds, textured OBJ, and glTF/GLB models.
  - Interactive studio controls: OrbitControls, dynamic lighting, wireframe toggles, camera view presets (Top, Front, Isometric), normal calculation, and point size adjustments.
  - **Zero GPU Memory Leaks**: Automatic WebGL buffer geometry and material disposal on model change and unmount.

- **Mobile Augmented Reality (AR) via QR Code**:
  - Instantly project reconstructed 3D assets into the physical room through smartphone cameras.
  - Generates dynamic QR codes configured with automatic Wi-Fi LAN IP detection for seamless local testing.
  - Native WebXR / Google Scene Viewer on Android and Apple Quick Look (`.usdz`) on iOS without requiring app installations.

- **Computer Vision Diagnostics**:
  - Image quality screening: Laplacian variance sharpness (blur detection), scene illumination, contrast, and resolution verification.
  - Scale-Invariant Feature Transform (SIFT) keypoint extraction.
  - Pairwise FLANN/KNN matching with Lowe's ratio test ($d_1 / d_2 < 0.75$).
  - Epipolar geometric verification via Fundamental Matrix RANSAC with interactive side-by-side match visualization.

- **Real-Time WebSocket Terminal**:
  - Live execution log and stage progress broadcasting from background worker threads directly to the frontend console terminal.

- **Cloud-Resilient & Memory-Safe Architecture**:
  - **SQLite Write-Ahead Logging (WAL)**: `PRAGMA journal_mode=WAL` with a 30-second busy timeout enables non-blocking concurrent reads and background worker writes.
  - **Chunked Image Streaming**: Saves uploads in 64 KB chunks, keeping memory overhead under 64 KB and preventing 512 MB Out-Of-Memory (OOM) crashes on Render free tier.
  - **Self-Healing Storage Sync**: Automatically detects and re-registers workspaces upon container restarts.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React 19 SPA (Frontend)                         │
│  ┌───────────────────┐  ┌───────────────────┐  ┌────────────────────┐  │
│  │   Dashboard /     │  │   Interactive     │  │  Mobile AR Modal   │  │
│  │  Project Manager  │  │ 3D Viewer (Three) │  │  (WebXR / QR Code) │  │
│  └─────────┬─────────┘  └─────────▲─────────┘  └─────────▲──────────┘  │
└────────────┼──────────────────────┼──────────────────────┼─────────────┘
             │ HTTP / Multipart     │ Stream PLY / GLB     │ LAN URL
             ▼                      │                      │
┌───────────────────────────────────┴──────────────────────┴─────────────┐
│                         FastAPI Backend                                │
│                                                                        │
│  ┌────────────────────┐   ┌────────────────────┐   ┌─────────────────┐ │
│  │  Image Ingestion   │──▶│  CV Diagnostics &  │──▶│ Reconstruction  │ │
│  │  (Chunked Stream)  │   │   SIFT Matching    │   │   Dispatcher    │ │
│  └────────────────────┘   └────────────────────┘   └────────┬────────┘ │
│                                                             │          │
│            ┌────────────────────────────────────────────────┴──┐       │
│            ▼                                                   ▼       │
│  ┌───────────────────────┐                           ┌───────────────┐ │
│  │   Local 3D Engine     │                           │   Cloud AI    │ │
│  │  (Visual Hull / CPU)  │                           │  (TripoSR /   │ │
│  │  • CLAHE Enhancement  │                           │   Meshy.ai)   │ │
│  │  • Radial Slicing     │                           └───────┬───────┘ │
│  │  • UV Texture Baking  │                                   │         │
│  └──────────┬────────────┘                                   │         │
│             │                                                │         │
│             └───────────────────────┬────────────────────────┘         │
│                                     ▼                                  │
│                       ┌───────────────────────────┐                    │
│                       │   Artifacts Generation    │                    │
│                       │    (GLB / PLY / Poses)    │                    │
│                       └─────────────┬─────────────┘                    │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ SQLite Database (WAL Mode)  +  Local Disk Storage (storage/)     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
E:\Cgip_Project\
├── backend/                        # FastAPI Backend Application
│   ├── routers/                    # Modular API route controllers
│   │   ├── projects.py             # Project lifecycle & CRUD endpoints
│   │   ├── images.py               # Chunked image uploads & CV validation
│   │   ├── analysis.py             # Quality diagnostics & angle coverage
│   │   ├── features.py             # SIFT matching & epipolar visualizations
│   │   ├── reconstruct.py          # 3D pipeline trigger, cancel & status
│   │   ├── models_3d.py            # Artifact retrieval & download endpoints
│   │   ├── websocket.py            # Real-time WebSocket connection router
│   │   └── settings_router.py      # App settings & API key management
│   ├── services/                   # Business logic and processing engines
│   │   ├── cv_service.py           # SIFT, Laplacian variance & RANSAC matching
│   │   ├── local_3d_engine.py      # Pure-CPU visual hull & UV texture generator
│   │   ├── cloud_3d_service.py     # TripoSR & Meshy.ai cloud 3D integrations
│   │   ├── gemini_service.py       # Gemini Vision visual grounding & cropping
│   │   ├── open3d_service.py       # Point cloud filtering & Poisson meshing
│   │   ├── colmap_service.py       # COLMAP CLI wrapper (SfM / MVS runner)
│   │   ├── file_service.py         # Directory management & path sanitization
│   │   └── job_manager.py          # Background threading & WebSocket dispatcher
│   ├── config.py                   # Pydantic environment configuration
│   ├── database.py                 # SQLAlchemy engine with SQLite WAL & PRAGMAs
│   ├── main.py                     # Application entrypoint & SPA static server
│   ├── models.py                   # Relational database models (indexed)
│   └── schemas.py                  # Pydantic request and response schemas
│
├── frontend/                       # React 19 + Vite Frontend Application
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js           # Axios instance & dynamic WebSocket resolution
│   │   ├── components/             # Reusable UI & 3D WebGL components
│   │   │   ├── Viewer3D.jsx        # Three.js WebGL canvas for PLY/GLB models
│   │   │   ├── MobileARModal.jsx   # Mobile AR QR code generator & WebXR handoff
│   │   │   ├── DropzoneUpload.jsx  # Drag-and-drop multi-file uploader
│   │   │   ├── FeatureMatchViewer.jsx # Epipolar feature correspondence viewer
│   │   │   ├── CoverageRadar.jsx   # Radial camera orientation visualizer
│   │   │   ├── TerminalLogs.jsx    # Live WebSocket execution terminal
│   │   │   ├── Navbar.jsx          # Top navigation bar
│   │   │   ├── Sidebar.jsx         # Project stage navigation sidebar
│   │   │   ├── TempleHeroScene.jsx # 3D stylized temple canvas on Dashboard
│   │   │   └── WebcamCapture.jsx   # Direct browser camera snapshot capture
│   │   ├── pages/                  # Application views / routes
│   │   │   ├── Dashboard.jsx       # Workspace summary, statistics & recent scans
│   │   │   ├── NewProject.jsx      # Project creation form
│   │   │   ├── ImageAcquisition.jsx# Upload management & thumbnail gallery
│   │   │   ├── ImageAnalysis.jsx   # Blur, brightness & camera coverage report
│   │   │   ├── ReconstructionStudio.jsx # 3D pipeline execution & live terminal
│   │   │   ├── ModelViewerPage.jsx # Full-screen 3D model inspection & export
│   │   │   ├── MobileARViewer.jsx  # Standalone mobile model-viewer AR page
│   │   │   ├── SettingsPage.jsx    # Hardware limits & AI credentials config
│   │   │   └── AboutPage.jsx       # Educational documentation & pipeline guide
│   │   ├── App.jsx                 # Route definitions & layout wrappers
│   │   └── main.jsx                # React DOM mount entrypoint
│   ├── package.json                # Frontend dependencies & npm scripts
│   └── vite.config.js              # Vite bundler configuration & dev proxies
│
├── storage/                        # Persistent project data (ignored by git)
│   └── projects/                   # Workspaces indexed by project UUID
│       └── <project_id>/
│           ├── source_images/      # Uploaded camera photographs
│           ├── processed_images/   # Resized/denoised working copies
│           ├── matches/            # Pairwise epipolar feature match images
│           ├── models/             # Reconstructed 3D artifacts (PLY, GLB)
│           └── camera_poses.json   # Extracted camera projection matrices
│
├── tests/                          # Automated backend test suite
│   ├── test_api.py                 # REST endpoint & status verification tests
│   ├── test_cloud_and_local_pipeline.py # 3D engine dispatching tests
│   ├── test_cv_features.py         # SIFT extraction & Laplacian sharpness tests
│   ├── test_gemini_coverage.py     # Gemini Vision integration tests
│   └── test_open3d_processing.py   # Point cloud filtering & Poisson tests
│
├── requirements.txt                # Python backend dependencies
└── README.md                       # Project documentation
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/) |
| **Database & ORM** | [SQLAlchemy 2.0](https://www.sqlalchemy.org/), [SQLite](https://www.sqlite.org/) with WAL mode |
| **Computer Vision** | [OpenCV](https://opencv.org/) (SIFT, Laplacian, RANSAC, CLAHE), [NumPy](https://numpy.org/) |
| **3D Geometry & Meshing** | [Open3D](http://www.open3d.org/), [Trimesh](https://trimesh.org/), [COLMAP](https://colmap.github.io/) |
| **Cloud AI 3D Engines** | [Meshy.ai](https://www.meshy.ai/) API, [Hugging Face](https://huggingface.co/) Spaces (TripoSR), [Google Gemini Vision](https://ai.google.dev/) |
| **Frontend Framework** | [React 19](https://react.dev/), [Vite](https://vitejs.dev/) |
| **3D WebGL Rendering** | [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [@react-three/drei](https://github.com/pmndrs/drei) |
| **Mobile AR & QR** | [@google/model-viewer](https://modelviewer.dev/), [qrcode](https://www.npmjs.com/package/qrcode) |
| **Styling & Icons** | [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |

---

## Getting Started

### Prerequisites

- **Python 3.10 to 3.12**
- **Node.js 18+** & npm
- *(Optional)* COLMAP for traditional large-scale multi-view stereo photogrammetry.

---

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/Sujayhs07/Reconstruct3D.git
cd Reconstruct3D

# Create and activate a Python virtual environment
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On Linux / macOS:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI development server
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

The interactive Swagger API documentation will be available at:
`http://localhost:8000/docs`

---

### 2. Frontend Setup

In a separate terminal window:

```bash
# Navigate to the frontend directory
cd frontend

# Install JavaScript dependencies
npm install

# Start the Vite development server
npm run dev
```

The web application will open at:
`http://localhost:5173`

---

### 3. Running Tests

Run the automated pytest test suite to verify all backend computer vision, database, and reconstruction endpoints:

```bash
# From the repository root (with .venv activated)
python -m pytest tests/ -v
```

To verify the frontend production build:

```bash
npm run build --prefix frontend
```

---

## Deployment Guide (Render)

### Option A: Unified Full-Stack Service (Recommended)

You can deploy both the FastAPI backend and compiled React SPA on a single Render Web Service. This eliminates cross-origin (CORS) complications and operates within Render's free tier.

1. **Create a new Web Service** on [Render](https://render.com) and link your GitHub repository.
2. Configure the service settings:
   - **Environment**: `Python`
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && npm install --prefix frontend && npm run build --prefix frontend
     ```
   - **Start Command**:
     ```bash
     uvicorn backend.main:app --host 0.0.0.0 --port $PORT
     ```
3. **Environment Variables**:
   - `PORT`: `10000` (Render sets this automatically)
   - *(Optional)* `MESHY_API_KEY`: Your Meshy.ai API key for high-res cloud 3D generation.
   - *(Optional)* `GEMINI_API_KEY`: Your Google Gemini API key for smart visual grounding.

Render will build both the frontend and backend, serving the entire application from a single URL!

---

### Option B: Split Deployment (Vercel Frontend + Render Backend)

If you prefer hosting the React frontend on **Vercel** and the FastAPI backend on **Render**:

1. **Deploy Backend on Render**:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - Note down your backend URL (e.g., `https://reconstruct3d-api.onrender.com`).
2. **Deploy Frontend on Vercel**:
   - Root Directory: `frontend`
   - Environment Variable:
     - `VITE_API_BASE_URL`: `https://reconstruct3d-api.onrender.com/api`
   - Framework Preset: `Vite`

The frontend client dynamically uses `VITE_API_BASE_URL` and converts `https://` to `wss://` for real-time WebSocket terminal logs.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & system diagnostics |
| `GET` | `/api/network-info` | Returns local LAN IP for Mobile AR QR generation |
| `GET` | `/api/projects` | List all projects with thumbnail & status |
| `POST` | `/api/projects` | Create a new project workspace |
| `GET` | `/api/projects/{id}` | Get detailed project metrics & status |
| `DELETE` | `/api/projects/{id}` | Delete project, records, and files |
| `POST` | `/api/projects/{id}/images` | Upload photographs (chunked streaming) |
| `GET` | `/api/projects/{id}/analysis` | Image quality diagnostics (sharpness, blur) |
| `GET` | `/api/projects/{id}/analysis/coverage`| 360-degree radial camera orientation analysis |
| `POST` | `/api/projects/{id}/features` | Extract SIFT matches between image pairs |
| `POST` | `/api/projects/{id}/reconstruct` | Start 3D reconstruction in background worker |
| `POST` | `/api/projects/{id}/cancel` | Abort in-flight reconstruction job |
| `GET` | `/api/projects/{id}/status` | Query active stage, progress & counts |
| `GET` | `/api/projects/{id}/models` | List generated 3D models (PLY, OBJ, GLB) |
| `GET` | `/api/projects/{id}/models/download/{file}` | Download 3D point cloud or mesh |
| `WS` | `/ws/projects/{id}` | WebSocket stream for live logs & progress |
| `GET` | `/api/settings` | Get hardware limits & AI engine configuration |
| `POST` | `/api/settings` | Update hardware limits & API keys |

---

## Configuration & Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./storage/reconstruct3d.db` | SQLAlchemy connection string |
| `STORAGE_DIR` | `./storage` | Directory where uploaded images & models are stored |
| `COLMAP_PATH` | `colmap` | Path to COLMAP binary |
| `MAX_IMAGE_UPLOAD_SIZE_MB` | `50` | Maximum file size per individual photo |
| `MESHY_API_KEY` | `""` | Optional Meshy.ai API key for cloud 3D generation |
| `GEMINI_API_KEY` | `""` | Optional Gemini API key for visual object detection |
| `VITE_API_BASE_URL` | `"/api"` | Frontend API URL override for split deployments |

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
