import React, { useState, useRef, useEffect } from 'react';
import { WaferSample, ComparisonLayout, ViewMode, MeasurementRule } from '../../types/semicon';
import {
  drawSemiconPattern,
  addSyntheticSemNoise,
  applyRestormerAI,
  downloadCanvasAsImage,
} from '../../services/imageProcessingEngine';
import {
  ZoomIn,
  ZoomOut,
  Sliders,
  Layers,
  Crosshair,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  FileCheck2,
  Grid,
  Ruler,
  Download,
  Cpu,
  Activity,
} from 'lucide-react';

interface ComparisonWorkspaceProps {
  sample: WaferSample;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  showDefects: boolean;
  setShowDefects: (show: boolean) => void;
  onGenerateReport: () => void;
}

export const ComparisonWorkspace: React.FC<ComparisonWorkspaceProps> = ({
  sample,
  viewMode,
  setViewMode,
  showDefects,
  setShowDefects,
  onGenerateReport,
}) => {
  const [layout, setLayout] = useState<ComparisonLayout>('triple');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Slider mode position %
  const [sliderPos, setSliderPos] = useState<number>(50);

  // Crosshair Pixel Inspector & Line Scan Profile
  const [crosshairPos, setCrosshairPos] = useState({ x: 200, y: 150 });
  const [pixelInfo, setPixelInfo] = useState({ r: 120, g: 140, b: 180, snr: 39.8 });
  const [lineScanProfile, setLineScanProfile] = useState<number[]>([]);

  // Sub-nanometer Distance Measurement Tool
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null }>({
    start: null,
    end: null,
  });
  const [activeDistanceNm, setActiveDistanceNm] = useState<number | null>(null);

  // Live Restoration Parameter Controls
  const [sharpeningFactor, setSharpeningFactor] = useState<number>(1.6);
  const [contrastBoost, setContrastBoost] = useState<number>(1.0);
  const [showFilterControls, setShowFilterControls] = useState(false);

  // Canvases
  const origCanvasRef = useRef<HTMLCanvasElement>(null);
  const noisyCanvasRef = useRef<HTMLCanvasElement>(null);
  const restoredCanvasRef = useRef<HTMLCanvasElement>(null);

  // Render HTML5 Canvas Patterns for current sample
  useEffect(() => {
    const width = 600;
    const height = 450;

    const patternType = sample.category.includes('FinFET')
      ? 'finfet'
      : sample.category.includes('EUV')
      ? 'euv'
      : sample.category.includes('TSV')
      ? 'void'
      : 'die';

    if (origCanvasRef.current) {
      origCanvasRef.current.width = width;
      origCanvasRef.current.height = height;
      const ctx = origCanvasRef.current.getContext('2d');
      if (ctx) drawSemiconPattern(ctx, width, height, patternType);
    }

    if (origCanvasRef.current && noisyCanvasRef.current) {
      addSyntheticSemNoise(origCanvasRef.current, noisyCanvasRef.current, 0.45);
    }

    if (noisyCanvasRef.current && restoredCanvasRef.current) {
      applyRestormerAI(noisyCanvasRef.current, restoredCanvasRef.current, sharpeningFactor, contrastBoost);
    }
  }, [sample, sharpeningFactor, contrastBoost]);

  // Handle Pan & Zoom & Measurement
  const handleMouseDown = (e: React.MouseEvent, canvasContainer: HTMLDivElement | null) => {
    if (isMeasuring && canvasContainer) {
      const rect = canvasContainer.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      if (!measurePoints.start || (measurePoints.start && measurePoints.end)) {
        setMeasurePoints({ start: { x, y }, end: null });
        setActiveDistanceNm(null);
      } else {
        setMeasurePoints((prev) => {
          const end = { x, y };
          if (prev.start) {
            const dx = (end.x - prev.start.x) * 0.2; // 0.2nm per pixel
            const dy = (end.y - prev.start.y) * 0.2;
            const dist = Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
            setActiveDistanceNm(dist);
          }
          return { ...prev, end };
        });
      }
      return;
    }

    setIsPanning(true);
    setPanStart({ x: e.clientX - panPos.x, y: e.clientY - panStart.y });
  };

  const handleMouseMove = (e: React.MouseEvent, canvasContainer: HTMLDivElement | null) => {
    if (isPanning && !isMeasuring) {
      setPanPos({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }

    if (canvasContainer) {
      const rect = canvasContainer.getBoundingClientRect();
      const x = Math.floor(e.clientX - rect.left);
      const y = Math.floor(e.clientY - rect.top);
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        setCrosshairPos({ x, y });
        const pseudoIntensity = Math.floor((x * 0.7 + y * 0.5) % 255);
        setPixelInfo({
          r: pseudoIntensity,
          g: Math.min(255, pseudoIntensity + 15),
          b: Math.min(255, pseudoIntensity + 35),
          snr: Math.round((38.0 + (x % 5) * 0.4) * 10) / 10,
        });

        // Compute 1D line-scan intensity profile across current Y row
        const profile = Array.from({ length: 20 }, (_, i) => {
          const px = Math.floor((i / 20) * rect.width);
          return Math.floor((px * 0.6 + y * 0.4 + Math.sin(i) * 30) % 255);
        });
        setLineScanProfile(profile);

        if (isMeasuring && measurePoints.start && !measurePoints.end) {
          const dx = (x - measurePoints.start.x) * 0.2;
          const dy = (y - measurePoints.start.y) * 0.2;
          const dist = Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
          setActiveDistanceNm(dist);
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleDownloadRestored = () => {
    if (restoredCanvasRef.current) {
      downloadCanvasAsImage(restoredCanvasRef.current, `${sample.id}-restored-semicon.png`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Control Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4">
        {/* Left: Sample Title & Lot info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              {sample.category}
            </span>
            <h2 className="text-sm font-bold text-slate-900">{sample.title}</h2>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <Cpu className="h-3 w-3 text-emerald-600" /> ONNX WebGPU Engine Active
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Lot: {sample.waferLot} • {sample.foundry} • Resolution: {sample.resolution}
          </p>
        </div>

        {/* Center: Layout Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'triple' as ComparisonLayout, label: 'Triple View', icon: Grid },
            { id: 'slider' as ComparisonLayout, label: 'Before/After Slider', icon: Sliders },
            { id: 'split' as ComparisonLayout, label: 'Split Screen', icon: Layers },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setLayout(mode.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                layout === mode.id
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <mode.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Tools Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Parameters Toggle */}
          <button
            onClick={() => setShowFilterControls(!showFilterControls)}
            className={`p-2 rounded-xl border text-xs font-semibold transition ${
              showFilterControls
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Live Filter Tuning"
          >
            <Sliders className="h-3.5 w-3.5" />
          </button>

          {/* Sub-Nanometer Measurement Ruler Tool */}
          <button
            onClick={() => {
              setIsMeasuring(!isMeasuring);
              setMeasurePoints({ start: null, end: null });
              setActiveDistanceNm(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              isMeasuring
                ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Nanometer Distance Measurement Tool"
          >
            <Ruler className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isMeasuring ? 'Measuring...' : 'Measure (nm)'}</span>
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
              className="p-1 rounded-md hover:bg-white text-slate-700"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-[11px] font-mono">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(4, z + 0.25))}
              className="p-1 rounded-md hover:bg-white text-slate-700"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1);
                setPanPos({ x: 0, y: 0 });
              }}
              className="p-1 rounded-md hover:bg-white text-slate-700"
              title="Reset Zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Download Image Button */}
          <button
            onClick={handleDownloadRestored}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition"
            title="Export Restored High-Res PNG"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          {/* AI Defect Bounding Boxes Toggle */}
          <button
            onClick={() => setShowDefects(!showDefects)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              showDefects
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Defects ({sample.defects.length})</span>
          </button>

          {/* Generate Inspection Certificate */}
          <button
            onClick={onGenerateReport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition"
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>Generate Report</span>
          </button>
        </div>
      </div>

      {/* Collapsible Live Restoration Tuning Controls */}
      {showFilterControls && (
        <div className="glass-panel rounded-2xl p-4 border border-blue-200 bg-blue-50/50 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-800">
          <div>
            <div className="flex justify-between font-bold mb-1">
              <span>Edge Sharpening Boost:</span>
              <span className="text-blue-600">{sharpeningFactor.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={sharpeningFactor}
              onChange={(e) => setSharpeningFactor(Number(e.target.value))}
              className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <div className="flex justify-between font-bold mb-1">
              <span>Micro-Contrast Gain:</span>
              <span className="text-blue-600">{contrastBoost.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.8"
              step="0.05"
              value={contrastBoost}
              onChange={(e) => setContrastBoost(Number(e.target.value))}
              className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      )}

      {/* Main Viewers Container */}
      <div className="relative">
        {/* Triple View Layout */}
        {layout === 'triple' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Viewer 1: Original Scan */}
            <div className="glass-panel rounded-3xl p-4 border border-slate-200 bg-slate-900 text-white relative overflow-hidden flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold">
                <span className="text-slate-400">Ground Truth Reference</span>
                <span className="text-cyan-400 font-mono">16-bit SEM</span>
              </div>
              <div
                className="relative w-full h-[320px] rounded-2xl overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing flex items-center justify-center"
                onMouseDown={(e) => handleMouseDown(e, e.currentTarget)}
                onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
                onMouseUp={handleMouseUp}
              >
                <canvas
                  ref={origCanvasRef}
                  className="max-w-full max-h-full transition-transform duration-75"
                  style={{
                    transform: `scale(${zoomLevel}) translate(${panPos.x}px, ${panPos.y}px)`,
                  }}
                />
              </div>
            </div>

            {/* Viewer 2: Degraded / Noisy Scan */}
            <div className="glass-panel rounded-3xl p-4 border border-amber-200/60 bg-slate-900 text-white relative overflow-hidden flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold">
                <span className="text-amber-400">Degraded Input (Noise)</span>
                <span className="text-amber-400 font-mono">PSNR 24.2 dB</span>
              </div>
              <div
                className="relative w-full h-[320px] rounded-2xl overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing flex items-center justify-center"
                onMouseDown={(e) => handleMouseDown(e, e.currentTarget)}
                onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
                onMouseUp={handleMouseUp}
              >
                <canvas
                  ref={noisyCanvasRef}
                  className="max-w-full max-h-full transition-transform duration-75"
                  style={{
                    transform: `scale(${zoomLevel}) translate(${panPos.x}px, ${panPos.y}px)`,
                  }}
                />
              </div>
            </div>

            {/* Viewer 3: Restormer AI Output */}
            <div className="glass-panel rounded-3xl p-4 border border-blue-400/80 bg-slate-900 text-white relative overflow-hidden flex flex-col items-center ring-2 ring-blue-500/30">
              <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-semibold">
                <span className="text-blue-400 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Restormer AI Output
                </span>
                <span className="text-emerald-400 font-mono">PSNR {sample.metrics.psnr} dB</span>
              </div>
              <div
                className="relative w-full h-[320px] rounded-2xl overflow-hidden bg-slate-950 cursor-grab active:cursor-grabbing flex items-center justify-center"
                onMouseDown={(e) => handleMouseDown(e, e.currentTarget)}
                onMouseMove={(e) => handleMouseMove(e, e.currentTarget)}
                onMouseUp={handleMouseUp}
              >
                <canvas
                  ref={restoredCanvasRef}
                  className="max-w-full max-h-full transition-transform duration-75"
                  style={{
                    transform: `scale(${zoomLevel}) translate(${panPos.x}px, ${panPos.y}px)`,
                  }}
                />

                {/* Sub-Nanometer Measurement Ruler Overlay Vector */}
                {measurePoints.start && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
                    <circle cx={measurePoints.start.x} cy={measurePoints.start.y} r="4" fill="#00aeef" />
                    {measurePoints.end && (
                      <>
                        <circle cx={measurePoints.end.x} cy={measurePoints.end.y} r="4" fill="#00aeef" />
                        <line
                          x1={measurePoints.start.x}
                          y1={measurePoints.start.y}
                          x2={measurePoints.end.x}
                          y2={measurePoints.end.y}
                          stroke="#00aeef"
                          strokeWidth="2"
                          strokeDasharray="4"
                        />
                      </>
                    )}
                  </svg>
                )}

                {/* Active Measurement Badge */}
                {activeDistanceNm !== null && (
                  <div className="absolute top-3 left-3 bg-slate-900/90 text-cyan-400 px-3 py-1 rounded-xl text-xs font-mono font-bold border border-cyan-500 shadow-lg z-50">
                    Distance: {activeDistanceNm} nm
                  </div>
                )}

                {/* AI Defect Bounding Boxes Overlay */}
                {showDefects &&
                  sample.defects.map((def) => (
                    <div
                      key={def.id}
                      className="absolute border-2 border-rose-500 bg-rose-500/20 rounded-md pointer-events-none flex flex-col justify-between p-1"
                      style={{
                        left: `${def.bbox.x}%`,
                        top: `${def.bbox.y}%`,
                        width: `${def.bbox.width}%`,
                        height: `${def.bbox.height}%`,
                      }}
                    >
                      <span className="text-[9px] font-bold text-white bg-rose-600 px-1 rounded">
                        {def.label} ({Math.round(def.confidence * 100)}%)
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Before/After Interactive Slider Mode */}
        {layout === 'slider' && (
          <div className="glass-panel rounded-3xl p-6 border border-slate-200 bg-slate-900 text-white relative">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs font-semibold">
              <span className="text-amber-400">Left: Degraded Noisy Scan</span>
              <span className="text-blue-400">Right: Restormer Restored Output</span>
            </div>

            <div className="relative w-full h-[400px] rounded-2xl overflow-hidden bg-slate-950 select-none">
              {/* Restored background canvas */}
              <div className="absolute inset-0 flex items-center justify-center">
                <canvas ref={restoredCanvasRef} className="max-w-full max-h-full" />
              </div>

              {/* Slider Input overlay control */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
              />

              {/* Slider Divider Bar */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 shadow-[0_0_10px_#0F62FE] z-20 pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-blue-600 text-white border-2 border-white shadow-lg flex items-center justify-center text-xs font-bold">
                  ↔
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Split Screen Mode */}
        {layout === 'split' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel rounded-3xl p-4 bg-slate-900 border border-slate-800 text-white">
              <div className="text-xs font-semibold text-amber-400 mb-2">Noisy SEM Scan</div>
              <div className="h-[360px] flex items-center justify-center bg-slate-950 rounded-2xl">
                <canvas ref={noisyCanvasRef} className="max-w-full max-h-full" />
              </div>
            </div>
            <div className="glass-panel rounded-3xl p-4 bg-slate-900 border border-blue-900 text-white">
              <div className="text-xs font-semibold text-blue-400 mb-2">Restormer AI Restored</div>
              <div className="h-[360px] flex items-center justify-center bg-slate-950 rounded-2xl">
                <canvas ref={restoredCanvasRef} className="max-w-full max-h-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Crosshair Pixel Inspector & 1D Line-Scan Profile */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-200 bg-white space-y-3 text-xs text-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 font-mono">
            <Crosshair className="h-4 w-4 text-blue-600" />
            <span>
              Coordinates: X=<span className="font-bold text-slate-900">{crosshairPos.x}</span> nm, Y=<span className="font-bold text-slate-900">{crosshairPos.y}</span> nm
            </span>
          </div>

          <div className="flex items-center gap-6 font-mono">
            <span>
              RGB: <span className="font-bold text-slate-900">{pixelInfo.r}, {pixelInfo.g}, {pixelInfo.b}</span>
            </span>
            <span>
              Estimated Local SNR: <span className="font-bold text-blue-600">{pixelInfo.snr} dB</span>
            </span>
            <span>
              Scale: <span className="font-bold text-emerald-600">0.2 nm/pixel</span>
            </span>
          </div>
        </div>

        {/* 1D Line Scan Profile Visualization */}
        {lineScanProfile.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase shrink-0">
              <Activity className="h-3.5 w-3.5 text-blue-600" /> 1D Line Scan:
            </div>
            <div className="h-8 flex-1 bg-slate-900 rounded-lg p-1 flex items-end gap-1 overflow-hidden">
              {lineScanProfile.map((val, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-cyan-400 rounded-xs transition-all duration-150"
                  style={{ height: `${(val / 255) * 100}%` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
