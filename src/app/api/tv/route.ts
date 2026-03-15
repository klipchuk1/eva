import { NextResponse } from "next/server";

const CIVITAI_API = "https://civitai.com/api/v1/images";

export const runtime = "nodejs";
export const revalidate = 300; // кеш 5 минут

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor") || undefined;
    const limit = url.searchParams.get("limit") || "20";
    const sort = url.searchParams.get("sort") || "Most Reactions";
    const period = url.searchParams.get("period") || "Week";

    const params = new URLSearchParams({
      limit,
      sort,
      period,
      nsfw: "None",
    });
    if (cursor) params.set("cursor", cursor);

    // Disable SSL verification for environments with cert issues
    if (typeof process !== "undefined") {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }

    const res = await fetch(`${CIVITAI_API}?${params}`, {
      headers: {
        "User-Agent": "Eva/1.0",
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Civitai API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    const items = (data.items || [])
      .filter(
        (item: any) =>
          item.url &&
          item.meta?.prompt &&
          (item.nsfwLevel === "None" || item.nsfw === false)
      )
      .map((item: any) => ({
        id: item.id,
        url: item.url,
        width: item.width,
        height: item.height,
        prompt: item.meta?.prompt || "",
        model: item.meta?.Model || item.meta?.model || "AI Model",
        likes: item.stats?.likeCount || 0,
        hearts: item.stats?.heartCount || 0,
        username: item.username || "anonymous",
      }));

    return NextResponse.json({
      items,
      nextCursor: data.metadata?.nextCursor || null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("TV API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
