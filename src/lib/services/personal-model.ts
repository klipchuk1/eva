import { createServiceClient } from "@/lib/supabase/server";
import { deductTokens, refundTokens } from "./token";

const API = "https://api.replicate.com/v1";
const TRAINING_TOKEN_COST = 150;

function getHeaders() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createPersonalModel(params: {
  userId: string;
  name: string;
  triggerWord: string;
}): Promise<string> {
  const supabase = createServiceClient();
  const id = crypto.randomUUID();

  const safeName = params.name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 30);

  const replicateOwner = process.env.REPLICATE_USERNAME;
  if (!replicateOwner) throw new Error("REPLICATE_USERNAME is not set");

  const modelSlug = `${safeName}-${id.slice(0, 8)}`;
  const destination = `${replicateOwner}/${modelSlug}`;

  // Create model on Replicate
  const res = await fetch(`${API}/models`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      owner: replicateOwner,
      name: modelSlug,
      visibility: "private",
      hardware: "gpu-t4-nano",
      description: `Personal LoRA model: ${params.name}`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create Replicate model: ${text}`);
  }

  const { error } = await supabase.from("personal_models").insert({
    id,
    user_id: params.userId,
    name: params.name,
    status: "uploading",
    trigger_word: params.triggerWord,
    training_provider: "replicate",
    training_images: [],
    training_images_count: 0,
    training_token_cost: TRAINING_TOKEN_COST,
  });

  if (error) throw new Error(`DB insert failed: ${error.message}`);
  return id;
}

export async function startTraining(params: {
  userId: string;
  modelId: string;
}): Promise<void> {
  const supabase = createServiceClient();

  const { data: model, error } = await supabase
    .from("personal_models")
    .select("*")
    .eq("id", params.modelId)
    .eq("user_id", params.userId)
    .single();

  if (error || !model) throw new Error("Model not found");

  // Check uploaded images
  const { data: files } = await supabase.storage
    .from("training-images")
    .list(`${params.userId}/${params.modelId}`);

  const imageFiles = (files || []).filter(
    (f) => !f.name.endsWith(".zip") && f.name !== ".emptyFolderPlaceholder"
  );

  if (imageFiles.length < 5) {
    throw new Error("Необходимо минимум 5 фотографий");
  }

  // Deduct tokens
  const deducted = await deductTokens({
    userId: params.userId,
    amount: TRAINING_TOKEN_COST,
    type: "generation",
    referenceId: params.modelId,
    description: `Обучение модели: ${model.name}`,
  });

  if (!deducted) throw new Error("Недостаточно токенов");

  // Create zip from uploaded images
  const zipUrl = await createTrainingZip(
    supabase,
    params.userId,
    params.modelId,
    imageFiles.map((f) => f.name)
  );

  // Determine destination
  const replicateOwner = process.env.REPLICATE_USERNAME;
  const safeName = model.name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 30);
  const destination = `${replicateOwner}/${safeName}-${params.modelId.slice(0, 8)}`;

  // Start training on Replicate
  const trainRes = await fetch(
    `${API}/models/ostris/flux-dev-lora-trainer/versions/d995297071a44dcb72244e6c19462111649ec86a9646c32df56daa7f14801944/trainings`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        destination,
        input: {
          input_images: zipUrl,
          trigger_word: model.trigger_word,
          steps: 1000,
          lora_rank: 16,
          learning_rate: 0.0004,
          batch_size: 1,
          resolution: "512,768,1024",
          autocaption: true,
          autocaption_prefix: `a photo of ${model.trigger_word},`,
        },
        webhook: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/replicate-training`,
        webhook_events_filter: ["completed"],
      }),
    }
  );

  if (!trainRes.ok) {
    const text = await trainRes.text();
    await refundTokens(params.userId, TRAINING_TOKEN_COST, params.modelId);
    throw new Error(`Training start failed: ${text}`);
  }

  const training = await trainRes.json();

  await supabase
    .from("personal_models")
    .update({
      status: "training",
      training_external_id: training.id,
      training_images_count: imageFiles.length,
      started_at: new Date().toISOString(),
    })
    .eq("id", params.modelId);
}

async function createTrainingZip(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  modelId: string,
  fileNames: string[]
): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const fileName of fileNames) {
    const { data, error } = await supabase.storage
      .from("training-images")
      .download(`${userId}/${modelId}/${fileName}`);

    if (error || !data) continue;
    const buffer = await data.arrayBuffer();
    zip.file(fileName, buffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
  const zipPath = `${userId}/${modelId}/training-data.zip`;

  await supabase.storage.from("training-images").upload(zipPath, zipBuffer, {
    contentType: "application/zip",
    upsert: true,
  });

  const { data: urlData } = supabase.storage
    .from("training-images")
    .getPublicUrl(zipPath);

  return urlData.publicUrl;
}

export async function checkTrainingStatus(modelId: string) {
  const supabase = createServiceClient();

  const { data: model } = await supabase
    .from("personal_models")
    .select("*")
    .eq("id", modelId)
    .single();

  if (!model) return { status: "unknown" };
  if (model.status === "ready" || model.status === "failed") {
    return { status: model.status, error: model.error_message };
  }
  if (!model.training_external_id) return { status: model.status };

  const res = await fetch(
    `${API}/trainings/${model.training_external_id}`,
    { headers: getHeaders() }
  );

  if (!res.ok) return { status: model.status };
  const training = await res.json();

  if (training.status === "succeeded") {
    const modelVersion = training.output?.version;
    const replicateOwner = process.env.REPLICATE_USERNAME;
    const safeName = model.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 30);
    const destination = `${replicateOwner}/${safeName}-${modelId.slice(0, 8)}`;

    await supabase
      .from("personal_models")
      .update({
        status: "ready",
        training_model_version: modelVersion,
        completed_at: new Date().toISOString(),
      })
      .eq("id", modelId);

    return { status: "ready" };
  }

  if (training.status === "failed" || training.status === "canceled") {
    await supabase
      .from("personal_models")
      .update({
        status: "failed",
        error_message: training.error || "Training failed",
      })
      .eq("id", modelId);

    if (model.training_token_cost) {
      await refundTokens(model.user_id, model.training_token_cost, modelId);
    }
    return { status: "failed", error: training.error };
  }

  // Still training — estimate progress
  const logs: string = training.logs || "";
  const stepMatch = logs.match(/step\s+(\d+)/gi);
  const lastStep = stepMatch
    ? parseInt(stepMatch[stepMatch.length - 1].replace(/\D/g, ""))
    : 0;
  const progress = Math.min(Math.round((lastStep / 1000) * 100), 99);

  return { status: "training", progress };
}
