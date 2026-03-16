"use client";

import { useState, useRef, useEffect } from "react";
import { Video, Sparkles, Loader2, ImagePlus, X, Images, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getModelsByType, MODEL_REGISTRY } from "@/lib/constants/models";
import { useStartGeneration, useGenerationPolling } from "@/lib/hooks/use-generation";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { cn } from "@/lib/utils";

const videoModels = getModelsByType("video");

const aspectRatios = [
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
  { label: "1:1", value: "1:1" },
];

const durationOptions = [3, 5, 7, 10, 15];

const textareaClass =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:bg-white/[0.07] resize-none transition-all duration-200";

interface FrameState {
  file: File | null;
  preview: string | null;  // blob URL or gallery URL
  galleryUrl: string | null; // if from gallery, already a public URL — no upload needed
}

const emptyFrame: FrameState = { file: null, preview: null, galleryUrl: null };

interface GalleryItem {
  id: string;
  result_url: string;
  prompt: string;
  created_at: string;
}

export default function GenerateVideoPage() {
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState(videoModels[0]?.id || "kling-3.0");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startFrame, setStartFrame] = useState<FrameState>(emptyFrame);
  const [endFrame, setEndFrame] = useState<FrameState>(emptyFrame);
  const [uploading, setUploading] = useState(false);
  const startImageRef = useRef<HTMLInputElement>(null);
  const endImageRef = useRef<HTMLInputElement>(null);

  // Gallery picker state
  const [galleryOpen, setGalleryOpen] = useState<"start" | "end" | null>(null);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const startGeneration = useStartGeneration();
  const { activeGenerations } = useGenerationStore();
  useGenerationPolling();

  const currentModel = MODEL_REGISTRY[modelId];
  const supportsStart = currentModel?.supportsStartImage ?? false;
  const supportsEnd = currentModel?.supportsEndImage ?? false;
  const maxDuration = currentModel?.maxDurationSec ?? 10;

  function calcCost(baseTokenCost: number, dur: number) {
    return Math.max(Math.ceil(baseTokenCost * (dur / 5)), 1);
  }

  const estimatedCost = calcCost(currentModel?.baseTokenCost ?? 0, duration);
  const availableDurations = durationOptions.filter((d) => d <= maxDuration);

  const recentResults = Array.from(activeGenerations.values())
    .filter((g) => g.type === "video")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Load gallery when picker opens
  useEffect(() => {
    if (galleryOpen && galleryItems.length === 0) {
      setGalleryLoading(true);
      fetch("/api/gallery?type=image&limit=50")
        .then((r) => r.json())
        .then((data) => setGalleryItems(data.items || []))
        .catch(() => {})
        .finally(() => setGalleryLoading(false));
    }
  }, [galleryOpen]);

  function handleFileSelect(file: File, type: "start" | "end") {
    const url = URL.createObjectURL(file);
    const frame: FrameState = { file, preview: url, galleryUrl: null };
    if (type === "start") setStartFrame(frame);
    else setEndFrame(frame);
  }

  function handleGallerySelect(item: GalleryItem) {
    const frame: FrameState = { file: null, preview: item.result_url, galleryUrl: item.result_url };
    if (galleryOpen === "start") setStartFrame(frame);
    else setEndFrame(frame);
    setGalleryOpen(null);
  }

  function clearFrame(type: "start" | "end") {
    const frame = type === "start" ? startFrame : endFrame;
    if (frame.preview && frame.file) URL.revokeObjectURL(frame.preview);
    if (type === "start") setStartFrame(emptyFrame);
    else setEndFrame(emptyFrame);
  }

  async function uploadImageToStorage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload/temp", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Не удалось загрузить изображение");
    const data = await res.json();
    return data.url;
  }

  async function resolveFrameUrl(frame: FrameState): Promise<string | undefined> {
    if (frame.galleryUrl) return frame.galleryUrl;
    if (frame.file) return uploadImageToStorage(frame.file);
    return undefined;
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setError("");
    setLoading(true);

    try {
      setUploading(true);
      const [startImageUrl, endImageUrl] = await Promise.all([
        supportsStart ? resolveFrameUrl(startFrame) : undefined,
        supportsEnd ? resolveFrameUrl(endFrame) : undefined,
      ]);
      setUploading(false);

      await startGeneration("video", {
        prompt,
        modelId,
        settings: {
          duration,
          aspect_ratio: aspectRatio,
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

  function handleModelChange(newModelId: string) {
    setModelId(newModelId);
    const newModel = MODEL_REGISTRY[newModelId];
    if (!newModel?.supportsStartImage) clearFrame("start");
    if (!newModel?.supportsEndImage) clearFrame("end");
    const newMax = newModel?.maxDurationSec ?? 10;
    if (duration > newMax) setDuration(Math.max(...durationOptions.filter((d) => d <= newMax)));
  }

  function FrameUploader({ type, frame, supportsFrame }: { type: "start" | "end"; frame: FrameState; supportsFrame: boolean }) {
    if (!supportsFrame) return null;
    const inputRef = type === "start" ? startImageRef : endImageRef;

    return (
      <div>
        <p className="text-xs text-slate-400 mb-1.5">{type === "start" ? "Первый кадр" : "Последний кадр"}</p>
        {frame.preview ? (
          <div className="relative rounded-xl overflow-hidden border border-white/[0.08] aspect-video">
            <img src={frame.preview} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => clearFrame(type)}
              className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={() => inputRef.current?.click()}
              className="flex-1 aspect-video rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] flex flex-col items-center justify-center gap-1 hover:border-amber-500/30 hover:bg-amber-500/[0.03] transition-all cursor-pointer"
            >
              <Upload className="h-4 w-4 text-slate-500" />
              <span className="text-[10px] text-slate-500">Файл</span>
            </button>
            <button
              onClick={() => setGalleryOpen(type)}
              className="flex-1 aspect-video rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] flex flex-col items-center justify-center gap-1 hover:border-amber-500/30 hover:bg-amber-500/[0.03] transition-all cursor-pointer"
            >
              <Images className="h-4 w-4 text-slate-500" />
              <span className="text-[10px] text-slate-500">Галерея</span>
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file, type);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-6">Генерация видео</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="py-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Промпт</label>
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
                  <FrameUploader type="start" frame={startFrame} supportsFrame={supportsStart} />
                  <FrameUploader type="end" frame={endFrame} supportsFrame={supportsEnd} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Model */}
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
                          img2vid
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-amber-400">~{calcCost(model.baseTokenCost, duration)} тк</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{model.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Aspect Ratio */}
          <Card>
            <CardContent className="py-4 space-y-3">
              <label className="block text-sm font-medium text-slate-300">Формат</label>
              <div className="grid grid-cols-3 gap-2">
                {aspectRatios.map((ar) => (
                  <button
                    key={ar.value}
                    onClick={() => setAspectRatio(ar.value)}
                    className={cn(
                      "rounded-xl border py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                      aspectRatio === ar.value
                        ? "border-amber-500/30 bg-amber-500/[0.08] text-amber-400"
                        : "border-white/[0.06] text-slate-400 hover:border-white/[0.12]"
                    )}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Duration */}
          <Card>
            <CardContent className="py-4 space-y-3">
              <label className="block text-sm font-medium text-slate-300">Длительность</label>
              <div className="flex gap-2">
                {availableDurations.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      "flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer",
                      duration === d
                        ? "border-amber-500/30 bg-amber-500/[0.08] text-amber-400"
                        : "border-white/[0.06] text-slate-400 hover:border-white/[0.12]"
                    )}
                  >
                    {d}с
                  </button>
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
            {uploading ? "Загрузка изображений..." : `Сгенерировать · ${estimatedCost} тк`}
          </Button>
        </div>

        {/* Results */}
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

      {/* Gallery picker modal */}
      {galleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setGalleryOpen(null)}>
          <div className="bg-[#0f1320] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
              <h3 className="text-sm font-medium text-white">
                Выбрать из галереи — {galleryOpen === "start" ? "первый кадр" : "последний кадр"}
              </h3>
              <button onClick={() => setGalleryOpen(null)} className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-400 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
              {galleryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : galleryItems.length === 0 ? (
                <p className="text-center text-slate-500 py-12 text-sm">Нет изображений в галерее</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {galleryItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleGallerySelect(item)}
                      className="aspect-square rounded-xl overflow-hidden border border-white/[0.06] hover:border-amber-500/40 transition-all cursor-pointer group"
                    >
                      <img
                        src={item.result_url}
                        alt={item.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
