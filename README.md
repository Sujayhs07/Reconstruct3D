# Reconstruct3D

An end-to-end 3D reconstruction pipeline and interactive web application powered by **FastAPI**, **COLMAP**, **Open3D**, and **React + Three.js**.

---

## Features

- **Multi-View 3D Reconstruction**: Convert collections of 2D photographs into textured 3D point clouds and meshes using Structure-from-Motion (SfM) and Multi-View Stereo (MVS).
- **Interactive 3D Web Viewer**: Inspect, rotate, pan, and analyze reconstructed models directly in the browser with Three.js.
- **RESTful API**: Fast and robust backend built on FastAPI with asynchronous background task processing and SQLite database storage.
- **Feature Extraction & Analysis**: Built-in computer vision diagnostics and feature matching previews.

---

## Project Structure

```
├── backend/
│   ├── routers/        # API endpoints (projects, images, reconstruct, features, analysis)
│   ├── services/       # Core services (COLMAP runner, Open3D processing, CV utilities)
│   ├── config.py       # Application configuration & paths
│   ├── database.py     # Database connection and session management
│   ├── main.py         # FastAPI application entrypoint
│   ├── models.py       # SQLAlchemy ORM models
│   └── schemas.py      # Pydantic schemas for request/response validation
├── frontend/
│   ├── src/            # React components, Three.js viewer, styles
│   ├── public/         # Static assets and icons
│   ├── package.json    # Frontend dependencies and build scripts
│   └── vite.config.js  # Vite bundler configuration
├── storage/            # Local data storage for projects and reconstructions
├── tests/              # Test suite
├── tools/              # Third-party tools setup (COLMAP guide)
└── requirements.txt    # Python dependencies
```

---

## Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** & npm
- **COLMAP** (See [tools/README.md](tools/README.md) for installation instructions)

### 1. Backend Setup

```bash
# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn backend.main:app --reload --port 8000
```

The API docs will be available at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The web application will be accessible at `http://localhost:5173`.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
