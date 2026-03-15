import { createServiceClient } from "./server";

const GENERATIONS_BUCKET = "generations";

export async function uploadGenerationResult(
  userId: string,
  generationId: string,
  fileBuffer: Buffer | ArrayBuffer,
  contentType: string
): Promise<string> {
  const supabase = createServiceClient();

  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("mp4")
      ? "mp4"
      : contentType.includes("mp3") || contentType.includes("mpeg")
        ? "mp3"
        : contentType.includes("webp")
          ? "webp"
          : "bin";

  const path = `${userId}/${generationId}.${ext}`;

  const { error } = await supabase.storage
    .from(GENERATIONS_BUCKET)
    .upload(path, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage
    .from(GENERATIONS_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function deleteGenerationFile(
  userId: string,
  generationId: string,
  ext: string
): Promise<void> {
  const supabase = createServiceClient();
  const path = `${userId}/${generationId}.${ext}`;

  await supabase.storage.from(GENERATIONS_BUCKET).remove([path]);
}
