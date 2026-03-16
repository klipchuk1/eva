"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Image as ImageIcon, Sparkles, Loader2, Download, Maximize2, X, ChevronDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getModelsByType } from "@/lib/constants/models";
import { useStartGeneration, useGenerationPolling } from "@/lib/hooks/use-generation";
import { useGenerationStore } from "@/lib/stores/generation-store";
import { cn } from "@/lib/utils";
import type { PersonalModel } from "@/types/database";

const imageModels = getModelsByType("image");

const resolutions = [
  { label: "1:1", width: 1024, height: 1024 },
  { label: "16:9", width: 1344, height: 768 },
  { label: "9:16", width: 768, height: 1344 },
  { label: "4:3", width: 1152, height: 896 },
];

const textareaClass =
  "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:bg-white/[0.07] resize-none transition-all duration-200";

export default function GenerateImagePage() {
  return (
    <Suspense>
      <GenerateImageContent />
    </Suspense>
  );
}

function GenerateImageContent() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [modelId, setModelId] = useState(imageModels[0]?.id || "flux-1.1-pro");
  const [resolution, setResolution] = useState(resolutions[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [personas, setPersonas] = useState<PersonalModel[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [prevModelId, setPrevModelId] = useState<string | null>(null);

  const searchParams = useSearchParams();

  // Load user personas
  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => {
        setPersonas((data.models || []).filter((m: PersonalModel) => m.status === "ready"));
      })
      .catch(() => {});
  }, []);
  function selectPersona(personaId: string | null) {
    if (personaId) {
      // Save current model and switch to nano-banana-pro
      if (modelId !== "nano-banana-pro") {
        setPrevModelId(modelId);
      }
      setSelectedPersona(personaId);
      setModelId("nano-banana-pro");
    } else {
      // Restore previous model
      setSelectedPersona(null);
      if (prevModelId) {
        setModelId(prevModelId);
        setPrevModelId(null);
      }
    }
  }

  const startGeneration = useStartGeneration();
  const { activeGenerations } = useGenerationStore();
  useGenerationPolling();

  // Подхватываем промпт из URL (?prompt=...)
  useEffect(() => {
    const urlPrompt = searchParams.get("prompt");
    if (urlPrompt && !prompt) {
      setPrompt(urlPrompt);
    }
  }, [searchParams]);

  const recentResults = Array.from(activeGenerations.values())
    .filter((g) => g.type === "image")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  async function handleDownload(url: string, prompt: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `eva-${prompt.slice(0, 30).replace(/[^a-zA-Zа-яА-Я0-9]/g, "_")}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setError("");
    setLoading(true);

    try {
      await startGeneration("image", {
        prompt,
        negativePrompt: negativePrompt || undefined,
        modelId,
        personalModelId: selectedPersona || undefined,
        settings: {
          width: resolution.width,
          height: resolution.height,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка генерации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-6">
        Генерация изображений
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Промпт
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Опишите изображение, которое хотите создать..."
                  rows={4}
                  className={textareaClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Негативный промпт{" "}
                  <span className="text-slate-500">(необязательно)</span>
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Что исключить из изображения..."
                  rows={2}
                  className={textareaClass}
                />
              </div>
            </CardContent>
          </Card>

          {/* Persona selector */}
          {personas.length > 0 && (
            <Card>
              <CardContent className="py-4 space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  Персона
                </label>
                <div className="relative">
                  <button
                    onClick={() => setPersonaOpen(!personaOpen)}
                    className="w-full text-left rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 transition-all duration-200 cursor-pointer hover:border-white/[0.12] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      {selectedPersona ? (
                        <>
                          <div className="h-7 w-7 rounded-full bg-white/[0.06] flex items-center justify-center overflow-hidden">
                            {(() => {
                              const p = personas.find((m) => m.id === selectedPersona);
                              const url = p?.training_images?.[0]
                                ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/training-images/${p.training_images[0]}`
                                : null;
                              return url ? (
                                <img src={url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <User className="h-4 w-4 text-slate-500" />
                              );
                            })()}
                          </div>
                          <span className="text-sm font-medium text-white">
                            {personas.find((m) => m.id === selectedPersona)?.name}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-slate-500">Без персоны</span>
                      )}
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", personaOpen && "rotate-180")} />
                  </button>
                  {personaOpen && (
                    <div className="absolute z-20 bottom-full mb-1 w-full rounded-xl border border-white/[0.08] bg-[#0f1320] backdrop-blur-xl shadow-xl overflow-auto max-h-48">
                      <button
                        onClick={() => { selectPersona(null); setPersonaOpen(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 transition-all cursor-pointer",
                          !selectedPersona ? "bg-amber-500/[0.08] text-amber-400" : "text-slate-400 hover:bg-white/[0.06]"
                        )}
                      >
                        <span className="text-sm">Без персоны</span>
                      </button>
                      {personas.map((p) => {
                        const avatarUrl = p.training_images?.[0]
                          ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/training-images/${p.training_images[0]}`
                          : null;
                        return (
                          <button
                            key={p.id}
                            onClick={() => { selectPersona(p.id); setPersonaOpen(false); }}
                            className={cn(
                              "w-full text-left px-3 py-2.5 transition-all cursor-pointer flex items-center gap-2.5",
                              selectedPersona === p.id ? "bg-amber-500/[0.08] text-amber-400" : "text-white hover:bg-white/[0.06]"
                            )}
                          >
                            <div className="h-6 w-6 rounded-full bg-white/[0.06] overflow-hidden shrink-0">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <User className="h-3.5 w-3.5 text-slate-500" />
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-medium">{p.name}</span>
                            <span className="text-xs text-slate-500 ml-auto">{p.training_images_count} фото</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {selectedPersona && (
                  <p className="text-xs text-amber-400/80">
                    Будет использована модель Nano Banana Pro с референсными фото
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Model */}
          <Card>
            <CardContent className="py-4 space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Модель{selectedPersona && <span className="text-xs text-slate-500 ml-2">(авто: Nano Banana Pro)</span>}
              </label>
              <div className="relative">
                <button
                  onClick={() => !selectedPersona && setModelOpen(!modelOpen)}
                  className={cn(
                    "w-full text-left rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 transition-all duration-200 flex items-center justify-between",
                    selectedPersona ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-white/[0.12]"
                  )}
                >
                  <div>
                    <span className="text-sm font-medium text-white">
                      {imageModels.find((m) => m.id === modelId)?.displayName}
                    </span>
                    <span className="text-xs text-amber-400 ml-2">
                      ~{imageModels.find((m) => m.id === modelId)?.baseTokenCost} тк
                    </span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", modelOpen && "rotate-180")} />
                </button>
                {modelOpen && (
                  <div className="absolute z-20 bottom-full mb-1 w-full rounded-xl border border-white/[0.08] bg-[#0f1320] backdrop-blur-xl shadow-xl overflow-auto max-h-64">
                    {imageModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => { setModelId(model.id); setModelOpen(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2.5 transition-all duration-150 cursor-pointer flex items-center justify-between",
                          modelId === model.id
                            ? "bg-amber-500/[0.08] text-amber-400"
                            : "text-white hover:bg-white/[0.06]"
                        )}
                      >
                        <div>
                          <span className="text-sm font-medium">{model.displayName}</span>
                          <p className="text-xs text-slate-500">{model.description}</p>
                        </div>
                        <span className="text-xs text-amber-400 font-medium shrink-0 ml-2">
                          ~{model.baseTokenCost} тк
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resolution */}
          <Card>
            <CardContent className="py-4 space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Разрешение
              </label>
              <div className="grid grid-cols-4 gap-2">
                {resolutions.map((res) => (
                  <button
                    key={res.label}
                    onClick={() => setResolution(res)}
                    className={cn(
                      "rounded-xl border py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
                      resolution.label === res.label
                        ? "border-amber-500/30 bg-amber-500/[0.08] text-amber-400"
                        : "border-white/[0.06] text-slate-400 hover:border-white/[0.12]"
                    )}
                  >
                    {res.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                {resolution.width} x {resolution.height}
              </p>
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              {error}
            </p>
          )}

          <Button
            onClick={handleGenerate}
            loading={loading}
            disabled={!prompt.trim()}
            className="w-full"
            size="lg"
          >
            <Sparkles className="h-4 w-4" />
            Сгенерировать
          </Button>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2">
          {recentResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02]">
              <ImageIcon className="h-10 w-10 text-slate-600 mb-3" />
              <p className="text-slate-500 text-sm">
                Результаты генерации появятся здесь
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {recentResults.map((gen) => (
                <Card key={gen.id} className="overflow-hidden group">
                  {gen.status === "completed" && gen.result_url ? (
                    <div className="relative">
                      <img
                        src={gen.result_url}
                        alt={gen.prompt}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => setLightboxUrl(gen.result_url!)}
                          className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
                          title="Открыть"
                        >
                          <Maximize2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDownload(gen.result_url!, gen.prompt)}
                          className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
                          title="Скачать"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : gen.status === "failed" ? (
                    <div className="w-full aspect-square flex items-center justify-center bg-red-500/5">
                      <p className="text-sm text-red-400 px-4 text-center">
                        {gen.error_message || "Ошибка генерации"}
                      </p>
                    </div>
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-white/[0.02]">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto" />
                        <p className="text-sm text-slate-500 mt-2">
                          Генерация...
                        </p>
                      </div>
                    </div>
                  )}
                  <CardContent className="py-2">
                    <p className="text-xs text-slate-500 truncate">
                      {gen.prompt}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              alt="Full size"
              className="max-w-full max-h-[90vh] rounded-xl object-contain"
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={() => handleDownload(lightboxUrl, "image")}
                className="p-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/20 text-white hover:bg-black/70 transition-colors cursor-pointer"
                title="Скачать"
              >
                <Download className="h-5 w-5" />
              </button>
              <button
                onClick={() => setLightboxUrl(null)}
                className="p-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/20 text-white hover:bg-black/70 transition-colors cursor-pointer"
                title="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
