import { MODEL_REGISTRY } from "@/lib/constants/models";
import type { AIProviderClient } from "./types";
import { replicateClient } from "./providers/replicate";
import { falClient } from "./providers/fal";
import { elevenlabsClient } from "./providers/elevenlabs";
import { geminiClient } from "./providers/gemini";

const providerClients: Record<string, AIProviderClient> = {
  replicate: replicateClient,
  fal: falClient,
  elevenlabs: elevenlabsClient,
  gemini: geminiClient,
};

export function getModelConfig(modelId: string) {
  const config = MODEL_REGISTRY[modelId];
  if (!config) {
    throw new Error(`Unknown model: ${modelId}`);
  }
  return config;
}

export function getProviderClient(provider: string): AIProviderClient {
  const client = providerClients[provider];
  if (!client) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return client;
}
