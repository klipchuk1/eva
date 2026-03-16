import type {
  AIProviderClient,
  ProviderSubmitParams,
  ProviderResult,
  ProviderStatus,
} from "../types";

const API = "https://api.replicate.com/v1";

function getHeaders() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string | string[] | null;
  error: string | null;
  urls: { get: string; cancel: string };
}

async function createPrediction(
  model: string,
  input: Record<string, unknown>
): Promise<ReplicatePrediction> {
  // Use the model-specific endpoint: /v1/models/{owner}/{name}/predictions
  const res = await fetch(`${API}/models/${model}/predictions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ input }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate error ${res.status}: ${text}`);
  }
  return res.json();
}

async function getPrediction(id: string): Promise<ReplicatePrediction> {
  const res = await fetch(`${API}/predictions/${id}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate error ${res.status}: ${text}`);
  }
  return res.json();
}

export const replicateClient: AIProviderClient = {
  async submit(params: ProviderSubmitParams): Promise<ProviderResult> {
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      ...params.settings,
    };
    if (params.negativePrompt) {
      input.negative_prompt = params.negativePrompt;
    }

    // Map start_image/end_image to model-specific parameter names
    if (input.start_image) {
      input.image = input.start_image;
      delete input.start_image;
    }
    if (input.end_image) {
      // Kling models use end_image, which is already correct
    }

    const prediction = await createPrediction(params.apiModel, input);

    return {
      externalId: prediction.id,
      isSync: false,
    };
  },

  async checkStatus(externalId: string): Promise<ProviderStatus> {
    const prediction = await getPrediction(externalId);

    if (prediction.status === "succeeded") {
      const output = prediction.output;
      const resultUrl = Array.isArray(output) ? output[0] : output;
      return {
        completed: true,
        failed: false,
        resultUrl: resultUrl ?? undefined,
        metadata: { raw_output: output },
      };
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      return {
        completed: false,
        failed: true,
        error: prediction.error ?? "Generation failed",
      };
    }

    return { completed: false, failed: false };
  },
};
