# SemiRestore.AI — AI-Based Image Restoration & Metrology Platform for Semiconductor Inspection

**SemiRestore.AI** is an end-to-end deep-learning image restoration and yield metrology platform designed for sub-7nm photolithography, EUV reticle mask inspection, and silicon wafer die metrology.

It features a **React 19 + TypeScript + Vite frontend application** paired with a **PyTorch neural network engine (`SemiRestoreNet`)** that handles multi-speckle noise reduction, 4x super-resolution, sub-nanometer edge preservation, and client-side ONNX browser inference.

---

## ✨ Features & Capabilities

- 🔬 **AI-Powered Image Restoration**: Denoises raw SEM detector output (+15.6 dB PSNR gain, 0.989 SSIM) preserving sub-10nm gate feature boundaries.
- 📐 **Sub-Nanometer Distance Measurement Tool**: Interactive distance ruler tool to measure sub-nanometer feature dimensions directly on the SEM scan canvas.
- 📊 **1D Cross-Sectional Line Scan Profile**: Real-time 1D pixel luminance waveform profiling across the inspection crosshair position.
- 🖼️ **High-Res PNG Export**: One-click direct image export for restored semiconductor scans.
- 🎛️ **Live Filter Tuning Controls**: Real-time slider controls for unsharp edge sharpening boost and micro-contrast gain.
- 📦 **Multi-File Batch Lot Upload & Processing**: Drag-and-drop or select multiple SEM image scans simultaneously into the inspection queue.
- 📑 **Batch History & CSV/JSON Export**: Multi-sample batch management with one-click export for CSV/JSON metrology certificates.
- 💾 **Browser LocalStorage Persistence**: Automatically persists uploaded wafer samples, inspection notes, and configuration across page reloads.
- 📄 **Executive PDF Yield Reports & Custom Notes**: Printable metrology certificates with custom inspector notes, editable operator credentials, and digital signature verification.

---

## 🏗 System Architecture

```
├── model/
│   ├── network.py           # SemiRestoreNet PyTorch architecture (~1.1M params, log-domain transform)
│   ├── losses.py            # Charbonnier + SSIM + Sobel Gradient combined loss
│   └── __init__.py          # Module exports
├── scripts/
│   ├── dataset.py           # Paired degraded/ground-truth loader + crop/flip/rotate augmentation
│   ├── train.py             # Training loop with PSNR validation + checkpointing
│   ├── evaluate.py          # Metrics evaluation (PSNR/SSIM) split by in-distribution vs OOD
│   └── export_and_infer.py  # Single-image PyTorch inference & ONNX model exporter
├── src/
│   ├── components/          # Dashboard, Inspection Workspace, Live Pipeline, Heatmap, Metrics, Settings
│   ├── services/            # Image processing engine & ONNX browser inference module
│   └── types/               # TypeScript interfaces for semiconductor wafer metrics
├── web/
│   └── inference.ts         # Client-side ONNX Runtime Web integration module
└── public/
    └── model/               # Location for exported ONNX model (`semirestore.onnx`)
```

---

## ⚡ Key AI Highlights & Engineering Rationale

1. **Log-Domain Transform (`model/network.py`)**: Converts multiplicative SEM detector speckle noise into an additive problem before feature extraction.
2. **Charbonnier + SSIM + Sobel Loss (`model/losses.py`)**: Eliminates reconstruction blur without introducing high-frequency ringing artifacts.
3. **Sub-pixel PixelShuffle Upsampling**: Achieves high-throughput super-resolution without transpose-convolution checkerboard artifacts.
4. **ONNX Browser Inference (`src/services/onnxInference.ts`)**: Enables zero-latency, client-side inference using `onnxruntime-web`.

---

## 🛠 Quick Start

### 1. Web Application (Frontend)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### 2. PyTorch AI Model (Training & Export)

```bash
# Install Python requirements
pip install torch torchvision pillow numpy

# Train model on paired dataset
python scripts/train.py --data-root ./data --epochs 60 --batch-size 16

# Evaluate performance (In-Distribution & OOD)
python scripts/evaluate.py --ckpt checkpoints/best.pt --data-root ./data --split test_in_distribution
python scripts/evaluate.py --ckpt checkpoints/best.pt --data-root ./data --split test_ood

# Export model to ONNX format for browser inference
python scripts/export_and_infer.py export --ckpt checkpoints/best.pt --out public/model/semirestore.onnx
```

---

## 📄 Documentation
For detailed model benchmark results, evaluation methodology, and hackathon presentation tips, see [MODEL_README.md](file:///d:/SemiRestore-AI/MODEL_README.md).

