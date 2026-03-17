"use client";

import { useEffect, useState } from "react";
import { Image, Sparkles } from "lucide-react";

type ShowcaseItem = {
  id: string | number;
  url: string;
  prompt: string;
  model: string;
};

function ShowcaseRow({
  items,
  direction = "left",
  speed = 40,
}: {
  items: ShowcaseItem[];
  direction?: "left" | "right";
  speed?: number;
}) {
  const doubled = [...items, ...items];
  return (
    <div className="overflow-hidden relative">
      <div
        className="flex gap-4 w-max"
        style={{
          animation: `scroll-${direction} ${speed}s linear infinite`,
        }}
      >
        {doubled.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            className="relative w-[280px] h-[360px] md:w-[320px] md:h-[400px] rounded-2xl overflow-hidden shrink-0 group/card"
          >
            <img
              src={item.url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
              loading="lazy"
            />
            <div className="absolute top-3 left-3 z-10">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm border bg-blue-500/20 border-blue-400/30 text-blue-300">
                <Image className="h-2.5 w-2.5" /> Photo
              </span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-white/90 text-xs leading-relaxed line-clamp-2">
                {item.prompt}
              </p>
              <p className="text-amber-400 text-[11px] font-medium mt-1.5">
                {item.model}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShowcaseFeed() {
  const [row1, setRow1] = useState<ShowcaseItem[]>([]);
  const [row2, setRow2] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/tv?limit=40");
        const data = await res.json();
        if (data.items?.length) {
          // Deduplicate by URL
          const seen = new Set<string>();
          const unique = data.items.filter((item: ShowcaseItem) => {
            if (seen.has(item.url)) return false;
            seen.add(item.url);
            return true;
          });
          const half = Math.ceil(unique.length / 2);
          setRow1(unique.slice(0, half));
          setRow2(unique.slice(half));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Sparkles className="h-6 w-6 text-amber-400 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-slate-500">Загрузка витрины...</p>
        </div>
      </div>
    );
  }

  if (row1.length === 0) return null;

  return (
    <>
      <div className="space-y-4">
        <ShowcaseRow items={row1} direction="left" speed={45} />
        {row2.length > 0 && (
          <ShowcaseRow items={row2} direction="right" speed={50} />
        )}
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes scroll-left {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            @keyframes scroll-right {
              0% { transform: translateX(-50%); }
              100% { transform: translateX(0); }
            }
          `,
        }}
      />
    </>
  );
}
