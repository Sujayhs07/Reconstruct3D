# Tools Setup

## COLMAP

Reconstruct3D uses [COLMAP](https://colmap.github.io/) for Structure-from-Motion (SfM) and Multi-View Stereo (MVS).

### Windows Setup
1. Download prebuilt Windows binaries from [COLMAP GitHub Releases](https://github.com/colmap/colmap/releases) (e.g. `colmap-x64-windows-cuda.zip` or `colmap-x64-windows-no-cuda.zip`).
2. Extract the archive into this folder such that `tools/colmap/COLMAP.bat` (or `tools/colmap/bin/colmap.exe`) exists.
3. Alternatively, add `colmap` to your system `PATH` or specify the executable path in `.env`:
   ```bash
   COLMAP_PATH="C:/path/to/colmap.bat"
   ```

### Linux / macOS Setup
- **Ubuntu/Debian**:
  ```bash
  sudo apt-get install colmap
  ```
- **macOS**:
  ```bash
  brew install colmap
  ```
- Ensure `colmap` is accessible in your system `PATH`.
