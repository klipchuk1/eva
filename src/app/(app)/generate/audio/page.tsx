"use client";

import { useState } from "react";
import { Mic, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getModelsByType } from "@/lib/constants/models";
import { useStartGeneration, useGenerationPolling } from "@/lib/hooks/use-generation";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { cn } from "@/lib/utils";

const audioModels = getModelsByType("audio");

const defaultVoices = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", lang: "EN" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", lang: "EN" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", lang: "EN" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", lang: "EN" },
];

const textareaClass =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:bg-white/[0.07] resize-none transition-all duration-200";

export default function GenerateAudioPage() {
  const [text, setText] = useState("");
  const [modelId, setModelId] = useState(audioModels[0]?.id || "tts-turbo-2.5");
  const [voiceId, setVoiceId] = useState(defaultVoices[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startGeneration = useStartGeneration();
  const { activeGenerations } = useGenerationStore();
  useGenerationPolling();

  const recentResults = Array.from(activeGenerations.values())
    .filter((g) => g.type === "audio")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  async function handleGenerate() {
    if (!text.trim()) return;
    setError("");
    setLoading(true);
    try {
      await startGeneration("audio", {
        prompt: text,
        modelId,
        settings: { voice_id: voiceId },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка генерации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-6">Озвучка текста</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="py-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Текст для озвучки
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Введите текст, который нужно озвучить..."
                rows={6}
                maxLength={5000}
                className={textareaClass}
              />
              <p className="text-xs text-slate-500 mt-1.5">{text.length}/5000</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4 space-y-3">
              <label className="block text-sm font-medium text-slate-300">Модель</label>
              {audioModels.map((model) => (
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
            <CardContent className="py-4 space-y-3">
              <label className="block text-sm font-medium text-slate-300">Голос</label>
              <div className="grid grid-cols-2 gap-2">
                {defaultVoices.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setVoiceId(voice.id)}
                    className={cn(
                      "rounded-xl border py-2.5 px-3 text-sm font-medium transition-all duration-200 cursor-pointer",
                      voiceId === voice.id
                        ? "border-amber-500/30 bg-amber-500/[0.08] text-amber-400"
                        : "border-white/[0.06] text-slate-400 hover:border-white/[0.12]"
                    )}
                  >
                    {voice.name}
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

          <Button onClick={handleGenerate} loading={loading} disabled={!text.trim()} className="w-full" size="lg">
            <Sparkles className="h-4 w-4" /> Озвучить
          </Button>
        </div>

        <div className="lg:col-span-2">
          {recentResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
              <Mic className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">Результаты озвучки появятся здесь</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentResults.map((gen) => (
                <Card key={gen.id}>
                  <CardContent className="py-4">
                    {gen.status === "completed" && gen.result_url ? (
                      <audio src={gen.result_url} controls className="w-full" />
                    ) : gen.status === "failed" ? (
                      <p className="text-red-400 text-sm">{gen.error_message}</p>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                        <span className="text-sm text-slate-400">Генерация...</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{gen.prompt}</p>
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
