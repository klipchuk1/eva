"use client";

import { useState } from "react";
import { Video, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getModelsByType } from "@/lib/constants/models";
import { useStartGeneration, useGenerationPolling } from "@/lib/hooks/use-generation";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { cn } from "@/lib/utils";

const videoModels = getModelsByType("video");

const textareaClass =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:bg-white/[0.07] resize-none transition-all duration-200";

export default function GenerateVideoPage() {
  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState(videoModels[0]?.id || "kling-2.6");
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startGeneration = useStartGeneration();
  const { activeGenerations } = useGenerationStore();
  useGenerationPolling();

  const recentResults = Array.from(activeGenerations.values())
    .filter((g) => g.type === "video")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setError("");
    setLoading(true);
    try {
      await startGeneration("video", {
        prompt,
        modelId,
        settings: { duration },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка генерации");
    } finally {
      setLoading(false);
    }
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

          <Card>
            <CardContent className="py-4 space-y-3">
              <label className="block text-sm font-medium text-slate-300">Модель</label>
              {videoModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setModelId(model.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-all duration-200 cursor-pointer",
                    modelId === model.id
                      ? "border-amber-500/30 bg-amber-500/[0.08]"
                      : "border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{model.displayName}</span>
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
                max={10}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full"
              />
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              {error}
            </p>
          )}

          <Button onClick={handleGenerate} loading={loading} disabled={!prompt.trim()} className="w-full" size="lg">
            <Sparkles className="h-4 w-4" /> Сгенерировать видео
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
