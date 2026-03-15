import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

// DELETE — delete persona and its photos
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    // Get model to check ownership
    const { data: model } = await service
      .from("personal_models")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Персона не найдена" }, { status: 404 });
    }

    // Delete photos from storage
    if (model.training_images && model.training_images.length > 0) {
      await service.storage
        .from("training-images")
        .remove(model.training_images);
    }

    // Delete record
    await service
      .from("personal_models")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — upload photos for persona
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createAuthClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();

    // Verify ownership
    const { data: model } = await service
      .from("personal_models")
      .select("training_images")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Персона не найдена" }, { status: 404 });
    }

    const formData = await req.formData();
    const files = formData.getAll("photos") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "Нет файлов" }, { status: 400 });
    }

    const existingImages = model.training_images || [];
    const uploadedPaths: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const path = `${user.id}/${id}/${fileName}`;

      const buffer = await file.arrayBuffer();

      const { error } = await service.storage
        .from("training-images")
        .upload(path, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (!error) {
        uploadedPaths.push(path);
      }
    }

    const allImages = [...existingImages, ...uploadedPaths];

    // Get public URLs for reference
    const referenceUrls = allImages.map((path) => {
      const { data } = service.storage
        .from("training-images")
        .getPublicUrl(path);
      return data.publicUrl;
    });

    // Set avatar from first image
    const avatarUrl = referenceUrls[0] || null;

    // Update model
    await service
      .from("personal_models")
      .update({
        training_images: allImages,
        training_images_count: allImages.length,
        status: allImages.length > 0 ? "ready" : "uploading",
      })
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({
      uploaded: uploadedPaths.length,
      total: allImages.length,
      referenceUrls,
      avatarUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
