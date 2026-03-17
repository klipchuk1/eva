"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Pause,
  Play,
  SkipForward,
  SkipBack,
  Heart,
  Eye,
  EyeOff,
  ArrowLeft,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TvItem = {
  id: string | number;
  url: string;
  width: number;
  height: number;
  prompt: string;
  model: string;
  likes: number;
  hearts: number;
  username: string;
  source?: string;
};

const SLIDE_DURATION = 7000; // 7 секунд на слайд

export default function TvPage() {
  const [items, setItems] = useState<TvItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showPrompt, setShowPrompt] = useState(true);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const fetchItems = useCallback(async (cursor?: string) => {
    try {
      const params = new URLSearchParams({
        limit: "50",
        sort: "Most Reactions",
        period: "Month",
      });
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/tv?${params}`);
      const data = await res.json();

      if (data.items?.length) {
        setItems((prev) => (cursor ? [...prev, ...data.items] : data.items));
        setNextCursor(data.nextCursor);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Preload next image & load more when nearing end
  useEffect(() => {
    if (items.length > 0 && currentIndex < items.length - 1) {
      const img = new Image();
      img.src = items[currentIndex + 1].url;
    }
    // Load more when 10 items left
    if (currentIndex >= items.length - 10 && nextCursor) {
      fetchItems(nextCursor);
    }
    // If we went past the end, clamp
    if (currentIndex >= items.length && items.length > 0) {
      setCurrentIndex(items.length - 1);
    }
  }, [currentIndex, items.length, nextCursor, fetchItems]);

  // Auto-advance timer
  useEffect(() => {
    if (!playing || items.length === 0) return;

    startTimeRef.current = Date.now();
    setProgress(0);

    // Progress bar update
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setProgress(Math.min((elapsed / SLIDE_DURATION) * 100, 100));
    }, 50);

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
      setImageLoaded(false);
    }, SLIDE_DURATION);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [playing, items.length, currentIndex]);

  function goNext() {
    setCurrentIndex((prev) => Math.min(prev + 1, items.length - 1));
    setImageLoaded(false);
    setPromptExpanded(false);
    startTimeRef.current = Date.now();
  }

  function goPrev() {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
    setImageLoaded(false);
    setPromptExpanded(false);
    startTimeRef.current = Date.now();
  }

  // Keyboard controls
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
      if (e.key === "ArrowRight" || e.key === "l") goNext();
      if (e.key === "ArrowLeft" || e.key === "j") goPrev();
      if (e.key === "p") setShowPrompt((s) => !s);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [items.length]);

  const current = items[currentIndex];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_0_30px_rgba(245,158,11,0.4)] mb-4">
            <span className="text-lg font-bold text-gray-950">E</span>
          </div>
          <p className="text-white/60 text-sm animate-pulse">
            Загрузка ЭВА ТВ...
          </p>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <p className="text-white/60">Нет контента для показа</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black select-none overflow-hidden">
      {/* Background image (blurred) */}
      <div
        className="absolute inset-0 scale-110"
        style={{
          backgroundImage: `url(${current.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(60px) brightness(0.3)",
        }}
      />

      {/* Main image */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <img
          key={current.id}
          src={current.url}
          alt=""
          className={cn(
            "max-w-full max-h-full object-contain transition-all duration-700",
            imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-[1.02]"
          )}
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-30 h-1 bg-white/10">
        <div
          className="h-full bg-amber-500 transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600">
              <span className="text-[10px] font-bold text-gray-950">E</span>
            </div>
            <span className="text-white font-semibold text-sm">ЭВА ТВ</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={current ? `/generate/image?prompt=${encodeURIComponent(current.prompt)}` : "/generate/image"}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-2 text-xs font-semibold text-gray-950 hover:from-amber-300 hover:to-amber-400 transition-all shadow-[0_0_16px_rgba(245,158,11,0.25)]"
          >
            <Sparkles className="h-3 w-3" />
            Создать такое
          </Link>
        </div>
      </div>

      {/* Bottom controls + prompt */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
        onMouseDown={() => setPlaying(false)}
        onMouseUp={() => setPlaying(true)}
      >
        {/* Prompt area */}
        {showPrompt && (
          <div className="px-6 pb-3 max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-semibold uppercase tracking-wider">
                {current.model}
              </span>
              <span className="text-white/30 text-xs">
                by {current.username}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-white/60 text-xs leading-relaxed max-w-[600px]">
                {promptExpanded || current.prompt.length <= 80
                  ? current.prompt
                  : current.prompt.slice(0, 80) + "..."}
              </p>
              <div className="flex items-center gap-2">
                {current.prompt.length > 80 && (
                  <button
                    onClick={() => setPromptExpanded((v) => !v)}
                    className="text-amber-400/70 text-[10px] hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    {promptExpanded ? "Скрыть" : "Показать всё"}
                  </button>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(current.prompt);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-white/40 text-[10px] hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Controls — centered */}
        <div className="px-6 py-4 flex items-center justify-center gap-3">
          <button
            onClick={goPrev}
            className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="p-3 rounded-xl bg-white/20 backdrop-blur-sm border border-white/15 text-white hover:bg-white/30 transition-colors cursor-pointer"
          >
            {playing ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </button>
          <button
            onClick={goNext}
            className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowPrompt((s) => !s)}
            className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
            title={showPrompt ? "Скрыть промпт" : "Показать промпт"}
          >
            {showPrompt ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Side navigation (vertical) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
        <button
          onClick={goPrev}
          className="p-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5 text-white/40 hover:bg-white/15 hover:text-white transition-all cursor-pointer"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          onClick={goNext}
          className="p-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/5 text-white/40 hover:bg-white/15 hover:text-white transition-all cursor-pointer"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
