import { WaferSample, PipelineStage, ModelConfig, QualityMetrics, InspectionReportData } from '../types/semicon';
import { PRESET_WAFER_SAMPLES } from './imageProcessingEngine';

export interface GpuStatus {
  device: string;
  temperatureC: number;
  gpuLoadPct: number;
  vramUsedGb: number;
  vramTotalGb: number;
  cudaVersion: string;
  tensorRtEngine: string;
  activeModel: string;
  throughputFps: number;
}

const DEFAULT_GPU_STATUS: GpuStatus = {
  device: 'NVIDIA H100 SXM5 80GB (Fab-Node-04)',
  temperatureC: 48,
  gpuLoadPct: 68,
  vramUsedGb: 14.8,
  vramTotalGb: 80.0,
  cudaVersion: 'CUDA 12.4 / cuDNN 9.1',
  tensorRtEngine: 'TensorRT 10.2 FP16 Optimized',
  activeModel: 'Restormer-Semicon-v2.4',
  throughputFps: 148,
};

export const INITIAL_PIPELINE_STAGES: PipelineStage[] = [
  { id: 'stg-1', name: 'Uploading Image Data', description: 'Ingesting 16-bit SEM TIFF binary array', estimatedTimeMs: 300, status: 'pending', progress: 0, logs: [] },
  { id: 'stg-2', name: 'Image Validation & Resolution Audit', description: 'Auditing bit-depth, spatial sampling rate & spatial contrast', estimatedTimeMs: 400, status: 'pending', progress: 0, logs: [] },
  { id: 'stg-3', name: 'Noise Spectral Analysis', description: 'Estimating Gaussian SNR variance & Poisson shot noise distribution', estimatedTimeMs: 600, status: 'pending', progress: 0, logs: [] },
  { id: 'stg-4', name: 'Speckle & Sensor Artifact Removal', description: 'Bilateral spatial transform and spatial-frequency filtering', estimatedTimeMs: 800, status: 'pending', progress: 0, logs: [] },
  { id: 'stg-5', name: 'Restormer / SwinIR Super-Resolution', description: 'Multi-head transposed attention neural upscaling (4x)', estimatedTimeMs: 1200, status: 'pending', progress: 0, logs: [] },
  { id: 'stg-6', name: 'Sub-Nanometer Edge Recovery', description: 'High-pass unsharp transformer gradient sharpening', estimatedTimeMs: 700, status: 'pending', progress: 0, logs: [] },
  { id: 'stg-7', name: 'Dynamic Contrast & CLAHE Optimization', description: 'Local histogram equalization for sub-10nm feature contrast', estimatedTimeMs: 500, status: 'pending', progress: 0, logs: [] },
  { id: 'stg-8', name: 'Quality Metrics & Metrology Audit', description: 'Computing PSNR, SSIM, SNR gain, and AI defect bounding boxes', estimatedTimeMs: 600, status: 'pending', progress: 0, logs: [] },
  { id: 'stg-9', name: 'Inspection Report Assembly', description: 'Formulating executive PDF inspection certificate and JSON schema', estimatedTimeMs: 400, status: 'pending', progress: 0, logs: [] },
];

const STORAGE_SAMPLES_KEY = 'semirestore_wafer_samples_v1';
const STORAGE_CONFIG_KEY = 'semirestore_model_config_v1';

class MockBackendApi {
  private currentSamples: WaferSample[];
  private modelConfig: ModelConfig;

  constructor() {
    // Load config from localStorage if present
    const savedConfig = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (savedConfig) {
      try {
        this.modelConfig = JSON.parse(savedConfig);
      } catch (e) {
        this.modelConfig = this.getDefaultConfig();
      }
    } else {
      this.modelConfig = this.getDefaultConfig();
    }

    // Load samples from localStorage if present
    const savedSamples = localStorage.getItem(STORAGE_SAMPLES_KEY);
    if (savedSamples) {
      try {
        this.currentSamples = JSON.parse(savedSamples);
      } catch (e) {
        this.currentSamples = [...PRESET_WAFER_SAMPLES];
      }
    } else {
      this.currentSamples = [...PRESET_WAFER_SAMPLES];
    }
  }

  private getDefaultConfig(): ModelConfig {
    return {
      modelName: 'Restormer',
      accuracyLevel: 'high_accuracy',
      useGpuAcceleration: true,
      superResMultiplier: 4,
      defectDetectionThreshold: 0.85,
      autoReportGeneration: true,
      theme: 'light',
      denoiseStrength: 0.45,
      sharpeningFactor: 1.6,
      contrastBoost: 1.0,
    };
  }

  private persistSamples() {
    try {
      localStorage.setItem(STORAGE_SAMPLES_KEY, JSON.stringify(this.currentSamples));
    } catch (e) {
      console.warn('Could not persist wafer samples to localStorage:', e);
    }
  }

  private persistConfig() {
    try {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(this.modelConfig));
    } catch (e) {
      console.warn('Could not persist model config to localStorage:', e);
    }
  }

  public getGpuStatus(): GpuStatus {
    return {
      ...DEFAULT_GPU_STATUS,
      gpuLoadPct: Math.floor(62 + Math.random() * 14),
      temperatureC: Math.floor(46 + Math.random() * 5),
      throughputFps: Math.floor(140 + Math.random() * 20),
    };
  }

  public getModelConfig(): ModelConfig {
    return { ...this.modelConfig };
  }

  public updateModelConfig(newConfig: Partial<ModelConfig>): ModelConfig {
    this.modelConfig = { ...this.modelConfig, ...newConfig };
    this.persistConfig();
    return this.modelConfig;
  }

  public getSamples(): WaferSample[] {
    return [...this.currentSamples];
  }

  public addSample(sample: WaferSample): WaferSample {
    this.currentSamples = [sample, ...this.currentSamples];
    this.persistSamples();
    return sample;
  }

  public updateSample(id: string, updates: Partial<WaferSample>): WaferSample | null {
    const idx = this.currentSamples.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.currentSamples[idx] = { ...this.currentSamples[idx], ...updates };
      this.persistSamples();
      return this.currentSamples[idx];
    }
    return null;
  }

  public deleteSample(id: string): void {
    this.currentSamples = this.currentSamples.filter((s) => s.id !== id);
    this.persistSamples();
  }

  public deleteBatchSamples(ids: string[]): void {
    const idSet = new Set(ids);
    this.currentSamples = this.currentSamples.filter((s) => !idSet.has(s.id));
    this.persistSamples();
  }

  public exportBatchCSV(samplesToExport: WaferSample[]): string {
    const headers = [
      'Sample ID',
      'Title',
      'Category',
      'Wafer Lot',
      'Foundry',
      'Resolution',
      'PSNR (dB)',
      'SSIM',
      'Noise Reduction (%)',
      'Defects Count',
      'Timestamp',
    ];

    const rows = samplesToExport.map((s) => [
      s.id,
      `"${s.title.replace(/"/g, '""')}"`,
      `"${s.category}"`,
      `"${s.waferLot}"`,
      `"${s.foundry}"`,
      `"${s.resolution}"`,
      s.metrics.psnr,
      s.metrics.ssim,
      s.metrics.noiseReductionPct,
      s.defects.length,
      `"${s.timestamp}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  public generateReport(sample: WaferSample, operatorName: string = 'Dr. Elena Vance (Lead Metrology Engineer)'): InspectionReportData {
    const defectCount = sample.defects.length;
    const criticalCount = sample.defects.filter((d) => d.severity === 'critical').length;

    let verdict: InspectionReportData['verdict'] = 'PASSED (Tier 1 Yield)';
    let overallQualityScore = 98.4;

    if (criticalCount > 0) {
      verdict = 'DEFECT REJECTED';
      overallQualityScore = 64.2;
    } else if (defectCount > 0) {
      verdict = 'CONDITIONAL PASS';
      overallQualityScore = 86.8;
    }

    const recommendations = [];
    if (criticalCount > 0) {
      recommendations.push('Halt Lot production on Fab Node 18 for immediate EUV reticle cleaning.');
      recommendations.push('Trigger automated atomic force microscopy (AFM) depth profile verification.');
    } else if (defectCount > 0) {
      recommendations.push('Flag wafer lot for secondary chemical mechanical planarization (CMP) audit.');
      recommendations.push('Monitor M3 interconnect spatial variance across subsequent 25-wafer cassettes.');
    } else {
      recommendations.push('Wafer batch qualifies for Tier 1 high-yield packaging delivery.');
      recommendations.push('Proceed directly to automated wire bonding and flip-chip assembly.');
    }

    return {
      reportId: `REP-SEMI-${Math.floor(100000 + Math.random() * 900000)}`,
      generatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      waferSample: sample,
      modelConfig: this.modelConfig,
      operator: operatorName,
      foundryFacility: sample.foundry,
      overallQualityScore,
      verdict,
      actionableRecommendations: recommendations,
      customNotes: sample.notes,
    };
  }
}

export const backendApi = new MockBackendApi();
