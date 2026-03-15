import { v4 as uuidv4 } from "uuid";
import { createServiceClient } from "@/lib/supabase/server";
import { uploadGenerationResult } from "@/lib/supabase/storage";
import { getModelConfig, getProviderClient } from "@/lib/ai/router";
import { calculateCost } from "@/lib/ai/cost-calculator";
import { deductTokens, refundTokens } from "./token";
import type { Generation, GenerationType } from "@/types/database";

const RETRY_CONFIG: Record<
  GenerationType,
  { maxRetries: number; timeoutMs: number }
> = {
  image: { maxRetries: 2, timeoutMs: 10 * 60 * 1000 },
  video: { maxRetries: 1, timeoutMs: 30 * 60 * 1000 },
  audio: { maxRetries: 2, timeoutMs: 5 * 60 * 1000 },
};

export async function startGeneration(params: {
  userId: string;
  type: GenerationType;
  prompt: string;
  negativePrompt?: string;
  modelId: string;
  settings: Record<string, unknown>;
  personalModelId?: string;
}): Promise<Generation> {
  const supabase = createServiceClient();
  const config = getModelConfig(params.modelId);
  const generationId = uuidv4();

  // Calculate cost
  const tokenCost = calculateCost({
    modelId: params.modelId,
    type: params.type,
    settings: {
      ...params.settings,
      text_length: params.prompt.length,
    },
  });

  // Deduct tokens
  const deducted = await deductTokens({
    userId: params.userId,
    amount: tokenCost,
    type: "generation",
    referenceId: generationId,
    description: `${config.displayName}: ${params.prompt.slice(0, 50)}...`,
  });

  if (!deducted) {
    throw new Error("Недостаточно токенов");
  }

  // Create generation record
  const { data: generation, error: insertError } = await supabase
    .from("generations")
    .insert({
      id: generationId,
      user_id: params.userId,
      type: params.type,
      status: "pending",
      prompt: params.prompt,
      negative_prompt: params.negativePrompt || null,
      model_id: params.modelId,
      provider: config.provider,
      settings: params.settings,
      personal_model_id: params.personalModelId || null,
      token_cost: tokenCost,
      max_retries: RETRY_CONFIG[params.type].maxRetries,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    // Refund tokens if insert failed
    await refundTokens(params.userId, tokenCost, generationId);
    throw new Error(`Failed to create generation: ${insertError.message}`);
  }

  // Submit to AI provider
  try {
    const client = getProviderClient(config.provider);

    // If personal model is used, fetch reference images and inject into settings
    let submitSettings = { ...params.settings };
    let submitPrompt = params.prompt;

    console.log("[Generation] personalModelId:", params.personalModelId);

    if (params.personalModelId) {
      const { data: persona, error: personaError } = await supabase
        .from("personal_models")
        .select("name, training_images, training_images_count")
        .eq("id", params.personalModelId)
        .eq("user_id", params.userId)
        .single();

      console.log("[Generation] persona found:", !!persona, "error:", personaError?.message);
      console.log("[Generation] training_images:", persona?.training_images);

      if (persona && persona.training_images?.length > 0) {
        // Get public URLs for reference images via Supabase SDK
        const imageUrls = persona.training_images.map((path: string) => {
          const { data } = supabase.storage
            .from("training-images")
            .getPublicUrl(path);
          return data.publicUrl;
        });

        console.log("[Generation] image URLs:", imageUrls);

        submitSettings.image_input = imageUrls;
        // Enhance prompt to preserve the face
        submitPrompt = `A photo of the person shown in the reference images. ${params.prompt}. Keep the exact same face and identity from the reference photos.`;
      }
    }

    const result = await client.submit({
      apiModel: config.apiModel,
      prompt: submitPrompt,
      negativePrompt: params.negativePrompt,
      settings: submitSettings,
    });

    if (result.isSync && (result.resultBuffer || result.resultUrl)) {
      // Synchronous provider (e.g. ElevenLabs, Gemini) — result is ready
      let resultUrl = result.resultUrl;

      if (result.resultBuffer) {
        resultUrl = await uploadGenerationResult(
          params.userId,
          generationId,
          result.resultBuffer,
          result.contentType || "application/octet-stream"
        );
      }

      const { data: updated } = await supabase
        .from("generations")
        .update({
          status: "completed",
          result_url: resultUrl,
          result_metadata: result.metadata || {},
          completed_at: new Date().toISOString(),
        })
        .eq("id", generationId)
        .select()
        .single();

      // Increment total_generations
      await supabase.rpc("increment_generations", {
        p_user_id: params.userId,
      });

      return updated || generation;
    } else {
      // Async provider — save external_id for polling
      await supabase
        .from("generations")
        .update({
          status: "processing",
          external_id: result.externalId,
        })
        .eq("id", generationId);

      return { ...generation, status: "processing", external_id: result.externalId };
    }
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";

    await supabase
      .from("generations")
      .update({
        status: "failed",
        error_message: errorMsg,
      })
      .eq("id", generationId);

    await refundTokens(params.userId, tokenCost, generationId);

    throw new Error(`Generation failed: ${errorMsg}`);
  }
}

export async function pollGeneration(generationId: string): Promise<Generation> {
  const supabase = createServiceClient();

  const { data: gen, error } = await supabase
    .from("generations")
    .select("*")
    .eq("id", generationId)
    .single();

  if (error || !gen) throw new Error("Generation not found");

  // If not processing, return as-is
  if (gen.status !== "processing" || !gen.external_id) {
    return gen;
  }

  // Check timeout
  const config = RETRY_CONFIG[gen.type as GenerationType];
  const elapsed = Date.now() - new Date(gen.started_at).getTime();
  if (elapsed > config.timeoutMs) {
    await supabase
      .from("generations")
      .update({ status: "failed", error_message: "Timeout exceeded" })
      .eq("id", generationId);
    await refundTokens(gen.user_id, gen.token_cost, generationId);
    return { ...gen, status: "failed", error_message: "Timeout exceeded" };
  }

  // Check provider status
  try {
    const client = getProviderClient(gen.provider);
    const status = await client.checkStatus(gen.external_id);

    if (status.completed && status.resultUrl) {
      // Download and store
      const fileRes = await fetch(status.resultUrl);
      const buffer = await fileRes.arrayBuffer();
      const contentType = fileRes.headers.get("content-type") || "image/png";

      const storedUrl = await uploadGenerationResult(
        gen.user_id,
        generationId,
        buffer,
        contentType
      );

      const { data: updated } = await supabase
        .from("generations")
        .update({
          status: "completed",
          result_url: storedUrl,
          result_metadata: status.metadata || {},
          completed_at: new Date().toISOString(),
        })
        .eq("id", generationId)
        .select()
        .single();

      await supabase.rpc("increment_generations", {
        p_user_id: gen.user_id,
      });

      return updated || gen;
    }

    if (status.failed) {
      if (gen.retry_count < gen.max_retries) {
        // Retry
        const retryClient = getProviderClient(gen.provider);
        const retryResult = await retryClient.submit({
          apiModel: getModelConfig(gen.model_id).apiModel,
          prompt: gen.prompt,
          negativePrompt: gen.negative_prompt || undefined,
          settings: gen.settings as Record<string, unknown>,
        });

        await supabase
          .from("generations")
          .update({
            external_id: retryResult.externalId,
            retry_count: gen.retry_count + 1,
            error_message: null,
          })
          .eq("id", generationId);

        return { ...gen, retry_count: gen.retry_count + 1 };
      } else {
        await supabase
          .from("generations")
          .update({
            status: "failed",
            error_message: status.error || "Generation failed after retries",
          })
          .eq("id", generationId);

        await refundTokens(gen.user_id, gen.token_cost, generationId);
        return { ...gen, status: "failed", error_message: status.error };
      }
    }
  } catch {
    // Provider check failed — don't fail the generation, just return current state
  }

  return gen;
}
