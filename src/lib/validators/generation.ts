import { z } from "zod";

export const imageGenerationSchema = z.object({
  prompt: z.string().min(1, "Введите промпт").max(2000),
  negativePrompt: z.string().max(1000).optional(),
  modelId: z.string().min(1),
  personalModelId: z.string().uuid().optional(),
  settings: z.object({
    width: z.number().min(256).max(2048).default(1024),
    height: z.number().min(256).max(2048).default(1024),
    seed: z.number().optional(),
  }),
});

export const videoGenerationSchema = z.object({
  prompt: z.string().min(1, "Введите промпт").max(2000),
  modelId: z.string().min(1),
  settings: z.object({
    duration: z.number().min(2).max(15).default(5),
    aspect_ratio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
    start_image: z.string().url().optional(),
    end_image: z.string().url().optional(),
  }),
});

export const audioGenerationSchema = z.object({
  prompt: z.string().min(1, "Введите текст для озвучки").max(5000),
  modelId: z.string().min(1),
  settings: z.object({
    voice_id: z.string().min(1),
  }),
});

export type ImageGenerationInput = z.infer<typeof imageGenerationSchema>;
export type VideoGenerationInput = z.infer<typeof videoGenerationSchema>;
export type AudioGenerationInput = z.infer<typeof audioGenerationSchema>;
