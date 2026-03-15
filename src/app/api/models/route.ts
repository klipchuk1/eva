import { NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

// GET — list user's personas
export async function GET() {
  try {
    const supabase = await createAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();
    const { data: models } = await service
      .from("personal_models")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ models: models || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — create new persona
export async function POST(request: Request) {
  try {
    const supabase = await createAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || name.trim().length < 1) {
      return NextResponse.json(
        { error: "Введите имя персоны" },
        { status: 400 }
      );
    }

    const service = createServiceClient();

    // Check limit (max 10 personas)
    const { count } = await service
      .from("personal_models")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count >= 10) {
      return NextResponse.json(
        { error: "Максимум 10 персон" },
        { status: 400 }
      );
    }

    const modelId = uuidv4();

    const { data: model, error } = await service
      .from("personal_models")
      .insert({
        id: modelId,
        user_id: user.id,
        name: name.trim(),
        status: "uploading",
        trigger_word: name.trim(),
        training_images: [],
        training_images_count: 0,
        training_token_cost: 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
