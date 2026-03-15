"use client";

import { useEffect, useState, useCallback } from "react";
import { Image, Video, Mic, Download, Maximize2, X, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { Generation, GenerationType } from "@/types/database";

const tabs: { type: GenerationType | "all"; label: string; icon: typeof Image }[] = [
  { type: "all", label: "Все", icon: Image },
  { type: "image", label: "Фото", icon: Image },
  { type: "video", label: "Видео", icon: Video },
  { type: "audio", label: "Аудио", icon: Mic },
];

export default function GalleryPage() {
  const [items, setItems] = useState<Generation[]>([]);
  const [activeTab, setActiveTab] = useState<GenerationType | "all">("all");
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Удалить это изображение?")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  const fetchItems = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("type", activeTab);
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/gallery?${params}`);
      const data = await res.json();

      if (cursor) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setNextCursor(data.nextCursor);
      setLoading(false);
    },
    [activeTab]
  );

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-6">Галерея</h1>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
              activeTab === tab.type
                ? "bg-white/[0.08] text-amber-400 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {items.length === 0 && !loading ? (
        <div className="text-center py-20">
          <Image className="h-10 w-10 mx-auto mb-3 text-slate-600" />
          <p className="text-slate-500">Пока нет генераций</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden break-inside-avoid group">
              {item.type === "image" && item.result_url && (
                <div className="relative">
                  <img
                    src={item.result_url}
                    alt={item.prompt}
                    className="w-full"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => setLightboxUrl(item.result_url!)}
                      className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
                      title="Открыть"
                    >
                      <Maximize2 className="h-5 w-5" />
                    </button>
                    <a
                      href={item.result_url}
                      download
                      className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm border border-white/20 text-white hover:bg-white/30 transition-colors cursor-pointer"
                      title="Скачать"
                    >
                      <Download className="h-5 w-5" />
                    </a>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="p-2.5 rounded-xl bg-red-500/30 backdrop-blur-sm border border-red-400/30 text-white hover:bg-red-500/50 transition-colors cursor-pointer disabled:opacity-50"
                      title="Удалить"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
              {item.type === "video" && item.result_url && (
                <video
                  src={item.result_url}
                  className="w-full"
                  controls
                  preload="metadata"
                />
              )}
              {item.type === "audio" && item.result_url && (
                <div className="p-4">
                  <Mic className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <audio src={item.result_url} controls className="w-full" />
                </div>
              )}
              <div className="px-3 py-2.5 flex items-start justify-between gap-2">
                <p className="text-xs text-slate-500 line-clamp-2 flex-1">
                  {item.prompt}
                </p>
                {item.result_url && (
                  <a
                    href={item.result_url}
                    download
                    className="shrink-0 text-slate-600 hover:text-amber-400 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {nextCursor && !loading && (
        <div className="flex justify-center py-8">
          <Button
            variant="secondary"
            onClick={() => fetchItems(nextCursor)}
          >
            Загрузить ещё
          </Button>
        </div>
      )}
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
              <a
                href={lightboxUrl}
                download
                className="p-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/20 text-white hover:bg-black/70 transition-colors"
                title="Скачать"
              >
                <Download className="h-5 w-5" />
              </a>
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
