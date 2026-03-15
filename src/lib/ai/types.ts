import type { GenerationType } from "@/types/database";

export interface ModelConfig {
  provider: AIProvider;
  apiModel: string;
  type: GenerationType;
  baseTokenCost: number;
  displayName: string;
  description: string;
  isNew?: boolean;
  maxResolution?: { width: number; height: number };
  maxDurationSec?: number;
}

export type AIProvider =
  | "replicate"
  | "fal"
  | "elevenlabs"
  | "kling"
  | "vertex"
  | "openai"
  | "xai"
  | "gemini";

export interface GenerationRequest {
  prompt: string;
  negativePrompt?: string;
  modelId: string;
  settings: Record<string, unknown>;
  personalModelId?: string;
}

export interface ProviderResult {
  externalId?: string;
  resultUrl?: string;
  resultBuffer?: ArrayBuffer;
  contentType?: string;
  metadata?: Record<string, unknown>;
  isSync: boolean;
}

export interface ProviderStatus {
  completed: boolean;
  failed: boolean;
  resultUrl?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AIProviderClient {
  submit(params: ProviderSubmitParams): Promise<ProviderResult>;
  checkStatus(externalId: string): Promise<ProviderStatus>;
}

export interface ProviderSubmitParams {
  apiModel: string;
  prompt: string;
  negativePrompt?: string;
  settings: Record<string, unknown>;
}
