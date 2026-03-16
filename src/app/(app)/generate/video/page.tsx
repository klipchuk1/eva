"use client";

import { useState, useRef } from "react";
import { Video, Sparkles, Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getModelsByType, MODEL_REGISTRY } from "@/lib/constants/models";
import { useStartGeneration, useGenerationPolling } from "@/lib/hooks/use-generation";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { cn } from "@/lib/utils";

const videoModels = getModelsByType("video");

const textareaClass =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:bg-white/[0.07] resize-none transition-all duration-200";

export default function GenerateVideoPage() {
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState(videoModels[0]?.id || "kling-3.0");
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startImage, setStartImage] = useState<File | null>(null);
  const [startImagePreview, setStartImagePreview] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<File | null>(null);
  const [endImagePreview, setEndImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const startImageRef = useRef<HTMLInputElement>(null);
  const endImageRef = useRef<HTMLInputElement>(null);

  const startGeneration = useStartGeneration();
  const { activeGenerations } = useGenerationStore();
  useGenerationPolling();

  const currentModel = MODEL_REGISTRY[modelId];
  const supportsStart = currentModel?.supportsStartImage ?? false;
  const supportsEnd = currentModel?.supportsEndImage ?? false;
  const maxDuration = currentModel?.maxDurationSec ?? 10;

  const recentResults = Array.from(activeGenerations.values())
    .filter((g) => g.type === "video")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  function handleImageSelect(file: File, type: "start" | "end") {
    const url = URL.createObjectURL(file);
    if (type === "start") {
      setStartImage(file);
      setStartImagePreview(url);
    } else {
      setEndImage(file);
      setEndImagePreview(url);
    }
  }

  function clearImage(type: "start" | "end") {
    if (type === "start") {
      setStartImage(null);
      if (startImagePreview) URL.revokeObjectURL(startImagePreview);
      setStartImagePreview(null);
    } else {
      setEndImage(null);
      if (endImagePreview) URL.revokeObjectURL(endImagePreview);
      setEndImagePreview(null);
    }
  }

  async function uploadImageToStorage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload/temp", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Не удалось загрузить изображение");
    const data = await res.json();
    return data.url;
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setError("");
    setLoading(true);

    try {
      let startImageUrl: string | undefined;
      let endImageUrl: string | undefined;

      if (startImage && supportsStart) {
        setUploading(true);
        startImageUrl = await uploadImageToStorage(startImage);
      }
      if (endImage && supportsEnd) {
        setUploading(true);
        endImageUrl = await uploadImageToStorage(endImage);
      }
      setUploading(false);

      await startGeneration("video", {
        prompt,
        modelId,
        settings: {
          duration,
          ...(startImageUrl && { start_image: startImageUrl }),
          ...(endImageUrl && { end_image: endImageUrl }),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка генерации");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  }

  // Clear images that aren't supported when model changes
  function handleModelChange(newModelId: string) {
    setModelId(newModelId);
    const newModel = MODEL_REGISTRY[newModelId];
    if (!newModel?.supportsStartImage) clearImage("start");
    if (!newModel?.supportsEndImage) clearImage("end");
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-6">Генерация видео</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="py-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Промпт
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите видео, которое хотите создать..."
                rows={4}
                className={textareaClass}
              />
            </CardContent>
          </Card>

          {/* Start / End frame images */}
          {(supportsStart || supportsEnd) && (
            <Card>
              <CardContent className="py-4 space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  Кадры <span className="text-slate-500 text-xs">(необязательно)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Start image */}
                  {supportsStart && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">Первый кадр</p>
                      {startImagePreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-white/[0.08] aspect-video">
                          <img src={startImagePreview} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => clearImage("start")}
                            className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startImageRef.current?.click()}
                          className="w-full aspect-video rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] flex flex-col items-center justify-center gap-1 hover:border-amber-500/30 hover:bg-amber-500/[0.03] transition-all cursor-pointer"
                        >
                          <ImagePlus className="h-5 w-5 text-slate-500" />
                          <span className="text-xs text-slate-500">Загрузить</span>
                        </button>
                      )}
                      <input
                        ref={startImageRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageSelect(file, "start");
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}

                  {/* End image */}
                  {supportsEnd && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">Последний кадр</p>
                      {endImagePreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-white/[0.08] aspect-video">
                          <img src={endImagePreview} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => clearImage("end")}
                            className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => endImageRef.current?.click()}
                          className="w-full aspect-video rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] flex flex-col items-center justify-center gap-1 hover:border-amber-500/30 hover:bg-amber-500/[0.03] transition-all cursor-pointer"
                        >
                          <ImagePlus className="h-5 w-5 text-slate-500" />
                          <span className="text-xs text-slate-500">Загрузить</span>
                        </button>
                      )}
                      <input
                        ref={endImageRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageSelect(file, "end");
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                </div>
                {startImage && !endImage && supportsEnd && (
                  <p className="text-xs text-slate-500">
                    Можно добавить последний кадр для контроля финала видео
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="py-4 space-y-3">
              <label className="block text-sm font-medium text-slate-300">Модель</label>
              {videoModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-all duration-200 cursor-pointer",
                    modelId === model.id
                      ? "border-amber-500/30 bg-amber-500/[0.08]"
                      : "border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{model.displayName}</span>
                      {(model.supportsStartImage || model.supportsEndImage) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-slate-400">
                          {model.supportsStartImage && model.supportsEndImage ? "img2vid" : "1 кадр"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-amber-400">~{model.baseTokenCost} тк</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{model.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Длительность: <span className="text-amber-400">{duration}с</span>
              </label>
              <input
                type="range"
                min={2}
                max={maxDuration}
                value={Math.min(duration, maxDuration)}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between mt-1.5 px-0.5">
                {Array.from({ length: maxDuration - 1 }, (_, i) => i + 2).map((s) => (
                  <span key={s} className="text-[10px] text-slate-600">{s}с</span>
                ))}
              </div>
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              {error}
            </p>
          )}

          <Button onClick={handleGenerate} loading={loading} disabled={!prompt.trim()} className="w-full" size="lg">
            <Sparkles className="h-4 w-4" />
            {uploading ? "Загрузка изображений..." : "Сгенерировать видео"}
          </Button>
        </div>

        <div className="lg:col-span-2">
          {recentResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
              <Video className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">Результаты генерации появятся здесь</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentResults.map((gen) => (
                <Card key={gen.id} className="overflow-hidden">
                  {gen.status === "completed" && gen.result_url ? (
                    <video src={gen.result_url} controls className="w-full" />
                  ) : gen.status === "failed" ? (
                    <div className="p-8 text-center text-red-400">{gen.error_message}</div>
                  ) : (
                    <div className="p-12 flex flex-col items-center">
                      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                      <p className="text-sm text-slate-500 mt-3">Генерация видео... Это может занять несколько минут</p>
                    </div>
                  )}
                  <CardContent className="py-2">
                    <p className="text-xs text-slate-500 truncate">{gen.prompt}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
