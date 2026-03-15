import type { ModelConfig } from "@/lib/ai/types";

export const MODEL_REGISTRY: Record<string, ModelConfig> = {
  // ===== IMAGES =====
  "flux-1.1-pro": {
    provider: "replicate",
    apiModel: "black-forest-labs/flux-1.1-pro",
    type: "image",
    baseTokenCost: 5,
    displayName: "Flux 1.1 Pro",
    description: "Быстрая генерация высококачественных изображений",
    maxResolution: { width: 1440, height: 1440 },
  },
  "ideogram-v3": {
    provider: "replicate",
    apiModel: "ideogram-ai/ideogram-v3-balanced",
    type: "image",
    baseTokenCost: 8,
    displayName: "Ideogram V3",
    description: "Лучшая работа с текстом на изображениях",
    isNew: true,
    maxResolution: { width: 2048, height: 2048 },
  },
  "imagen-4": {
    provider: "replicate",
    apiModel: "google/imagen-4-fast",
    type: "image",
    baseTokenCost: 6,
    displayName: "Imagen 4 Fast",
    description: "Быстрая генерация от Google DeepMind",
    isNew: true,
    maxResolution: { width: 2048, height: 2048 },
  },
  "seedream-3": {
    provider: "replicate",
    apiModel: "bytedance/seedream-3",
    type: "image",
    baseTokenCost: 7,
    displayName: "Seedream 3",
    description: "Фотореалистичные изображения от ByteDance",
    maxResolution: { width: 2048, height: 2048 },
  },
  "luma-photon": {
    provider: "replicate",
    apiModel: "luma/photon-flash",
    type: "image",
    baseTokenCost: 4,
    displayName: "Luma Photon Flash",
    description: "Быстрая и дешёвая генерация от Luma AI",
    maxResolution: { width: 1440, height: 1440 },
  },
  "hidream": {
    provider: "replicate",
    apiModel: "prunaai/hidream-l1-fast",
    type: "image",
    baseTokenCost: 3,
    displayName: "HiDream L1 Fast",
    description: "Сверхбыстрая генерация, низкая стоимость",
    maxResolution: { width: 1024, height: 1024 },
  },
  "gemini-image": {
    provider: "gemini",
    apiModel: "gemini-2.5-flash-image",
    type: "image",
    baseTokenCost: 3,
    displayName: "Gemini Image",
    description: "Генерация от Google через прокси",
    maxResolution: { width: 1024, height: 1024 },
  },
  "nano-banana-pro": {
    provider: "replicate",
    apiModel: "google/nano-banana-pro",
    type: "image",
    baseTokenCost: 8,
    displayName: "Nano Banana Pro",
    description: "Генерация с референсными фото, сохранение лиц",
    supportsImageInput: true,
    maxResolution: { width: 2048, height: 2048 },
  },

  // ===== VIDEO =====
  "kling-3.0": {
    provider: "replicate",
    apiModel: "kwaivgi/kling-v3-video",
    type: "video",
    baseTokenCost: 50,
    displayName: "Kling 3.0",
    description: "Кинематографичное видео со звуком, до 15 сек",
    isNew: true,
    maxDurationSec: 15,
  },
  "kling-2.1": {
    provider: "replicate",
    apiModel: "kwaivgi/kling-v2.1",
    type: "video",
    baseTokenCost: 35,
    displayName: "Kling 2.1",
    description: "Качественное видео от Kuaishou",
    maxDurationSec: 10,
  },
  "pixverse-v5": {
    provider: "replicate",
    apiModel: "pixverse/pixverse-v5.6",
    type: "video",
    baseTokenCost: 30,
    displayName: "PixVerse V5.6",
    description: "Стилизованное видео, отличные эффекты",
    isNew: true,
    maxDurationSec: 8,
  },
  "luma-ray": {
    provider: "replicate",
    apiModel: "luma/ray-flash-2-720p",
    type: "video",
    baseTokenCost: 25,
    displayName: "Luma Ray Flash 2",
    description: "Быстрое видео 720p от Luma AI",
    maxDurationSec: 5,
  },
  "wan-2.1": {
    provider: "replicate",
    apiModel: "wavespeedai/wan-2.1-t2v-720p",
    type: "video",
    baseTokenCost: 20,
    displayName: "Wan 2.1 720p",
    description: "Доступное видео, хорошее качество",
    maxDurationSec: 5,
  },

  // ===== AUDIO =====
  "tts-turbo-2.5": {
    provider: "elevenlabs",
    apiModel: "eleven_turbo_v2_5",
    type: "audio",
    baseTokenCost: 2,
    displayName: "TTS Turbo 2.5",
    description: "Быстрая озвучка с низкой задержкой",
  },
  "multilingual-v2": {
    provider: "elevenlabs",
    apiModel: "eleven_multilingual_v2",
    type: "audio",
    baseTokenCost: 4,
    displayName: "Multilingual V2",
    description: "Мультиязычная озвучка высокого качества",
  },
};

export function getModelsByType(type: "image" | "video" | "audio") {
  return Object.entries(MODEL_REGISTRY)
    .filter(([, config]) => config.type === type)
    .map(([id, config]) => ({ id, ...config }));
}
