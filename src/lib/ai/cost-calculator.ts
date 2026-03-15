import { MODEL_REGISTRY } from "@/lib/constants/models";
import type { GenerationType } from "@/types/database";

export function calculateCost(params: {
  modelId: string;
  type: GenerationType;
  settings: Record<string, unknown>;
}): number {
  const config = MODEL_REGISTRY[params.modelId];
  if (!config) throw new Error(`Unknown model: ${params.modelId}`);

  let cost = config.baseTokenCost;

  if (params.type === "image") {
    const width = (params.settings.width as number) || 1024;
    const height = (params.settings.height as number) || 1024;
    const megapixels = (width * height) / 1_000_000;
    if (megapixels > 2) cost = Math.ceil(cost * 1.5);
    if (megapixels > 8) cost = Math.ceil(cost * 2.5);
  }

  if (params.type === "video") {
    const durationSec = (params.settings.duration as number) || 5;
    cost = Math.ceil(cost * (durationSec / 5));
  }

  if (params.type === "audio") {
    const textLength = (params.settings.text_length as number) || 500;
    cost = Math.ceil(config.baseTokenCost * (textLength / 500));
  }

  return Math.max(cost, 1);
}
