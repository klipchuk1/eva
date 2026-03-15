import { NextResponse } from "next/server";
import https from "https";

const CIVITAI_API = "https://civitai.com/api/v1/images";

// Fetch that ignores SSL errors (Civitai cert issue on some networks)
async function fetchIgnoreSSL(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "GET",
      rejectUnauthorized: false,
      headers: {
        "User-Agent": "Eva/1.0",
        Accept: "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Invalid JSON response"));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.end();
  });
}

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

    const data = await fetchIgnoreSSL(`${CIVITAI_API}?${params}`);

    // Преобразуем в наш формат, фильтруем только SFW с промптами
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
