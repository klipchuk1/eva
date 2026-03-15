import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { startGeneration } from "@/lib/services/generation";
import { audioGenerationSchema } from "@/lib/validators/generation";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const supabase = await createAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = audioGenerationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const generation = await startGeneration({
      userId: user.id,
      type: "audio",
      prompt: parsed.data.prompt,
      modelId: parsed.data.modelId,
      settings: parsed.data.settings,
    });

    return NextResponse.json(generation);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message === "Недостаточно токенов" ? 402 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
