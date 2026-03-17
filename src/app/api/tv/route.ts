import { NextResponse } from "next/server";

const CIVITAI_API = "https://civitai.com/api/v1/images";
const LEXICA_API = "https://lexica.art/api/v1/search";

export const runtime = "nodejs";
export const revalidate = 300; // кеш 5 минут

// Темы для ротации запросов к Lexica (разный контент каждый раз)
const LEXICA_THEMES = [
  "cinematic portrait 8k",
  "fantasy landscape epic",
  "cyberpunk city neon",
  "beautiful architecture photography",
  "hyperrealistic animal portrait",
  "surreal dreamscape art",
  "underwater ocean scene",
  "space nebula cosmic",
  "steampunk mechanical",
  "japanese garden zen",
  "northern lights aurora",
  "medieval castle dark",
  "retro futurism 80s",
  "macro photography nature",
  "abstract fluid art",
  "winter snow mountain",
  "tropical paradise sunset",
  "gothic cathedral interior",
  "robot android futuristic",
  "ancient ruins mystical",
];

// Параметры ротации для Civitai (разные сортировки/периоды)
const CIVITAI_VARIANTS = [
  { sort: "Most Reactions", period: "Week" },
  { sort: "Most Reactions", period: "Month" },
  { sort: "Most Comments", period: "Week" },
  { sort: "Most Collected", period: "Month" },
  { sort: "Newest", period: "Day" },
];

type TvItemRaw = {
  id: string | number;
  url: string;
  width: number;
  height: number;
  prompt: string;
  model: string;
  likes: number;
  hearts: number;
  username: string;
  source: string;
};

async function fetchCivitai(
  limit: number,
  sort: string,
  period: string,
  cursor?: string
): Promise<{ items: TvItemRaw[]; nextCursor: string | null }> {
  try {
    const params = new URLSearchParams({
      limit: String(limit),
      sort,
      period,
      nsfw: "None",
    });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`${CIVITAI_API}?${params}`, {
      headers: { "User-Agent": "Eva/1.0", Accept: "application/json" },
    });

    if (!res.ok) return { items: [], nextCursor: null };

    const data = await res.json();
    const items = (data.items || [])
      .filter(
        (item: any) =>
          item.url &&
          item.meta?.prompt &&
          (item.nsfwLevel === "None" || item.nsfw === false)
      )
      .map((item: any) => ({
        id: `c_${item.id}`,
        url: item.url,
        width: item.width || 1024,
        height: item.height || 1024,
        prompt: item.meta?.prompt || "",
        model: item.meta?.Model || item.meta?.model || "AI Model",
        likes: item.stats?.likeCount || 0,
        hearts: item.stats?.heartCount || 0,
        username: item.username || "anonymous",
        source: "civitai",
      }));

    return { items, nextCursor: data.metadata?.nextCursor || null };
  } catch {
    return { items: [], nextCursor: null };
  }
}

async function fetchLexica(query: string, limit: number): Promise<TvItemRaw[]> {
  try {
    const res = await fetch(`${LEXICA_API}?q=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.images || []).slice(0, limit).map((item: any) => ({
      id: `l_${item.id}`,
      url: item.src,
      width: item.width || 1024,
      height: item.height || 1024,
      prompt: item.prompt || "",
      model: item.model || "Stable Diffusion",
      likes: 0,
      hearts: 0,
      username: "lexica",
      source: "lexica",
    }));
  } catch {
    return [];
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "30", 10);

    // Disable SSL verification for environments with cert issues
    if (typeof process !== "undefined") {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    // Pick random Civitai variant for diversity
    const civVariant = CIVITAI_VARIANTS[Math.floor(Math.random() * CIVITAI_VARIANTS.length)];
    // Pick 2-3 random Lexica themes
    const shuffledThemes = shuffle(LEXICA_THEMES);
    const lexicaThemes = shuffledThemes.slice(0, 3);

    // Fetch from multiple sources in parallel
    const [civitaiResult, ...lexicaResults] = await Promise.all([
      fetchCivitai(Math.ceil(limit * 0.6), civVariant.sort, civVariant.period, cursor),
      ...lexicaThemes.map((theme) => fetchLexica(theme, Math.ceil(limit * 0.15))),
    ]);

    // Combine and deduplicate by prompt (avoid near-duplicates)
    const seenPrompts = new Set<string>();
    const allItems: TvItemRaw[] = [];

    for (const item of [...civitaiResult.items, ...lexicaResults.flat()]) {
      const promptKey = item.prompt.slice(0, 60).toLowerCase();
      if (!seenPrompts.has(promptKey) && item.prompt.length > 10) {
        seenPrompts.add(promptKey);
        allItems.push(item);
      }
    }

    // Shuffle to mix sources together
    const mixed = shuffle(allItems).slice(0, limit);

    return NextResponse.json({
      items: mixed,
      nextCursor: civitaiResult.nextCursor,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("TV API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
