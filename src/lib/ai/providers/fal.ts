import type {
  AIProviderClient,
  ProviderSubmitParams,
  ProviderResult,
  ProviderStatus,
} from "../types";

const FAL_API = "https://queue.fal.run";

function getHeaders() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not set");
  return {
    Authorization: `Key ${key}`,
    "Content-Type": "application/json",
  };
}

export const falClient: AIProviderClient = {
  async submit(params: ProviderSubmitParams): Promise<ProviderResult> {
    const input: Record<string, unknown> = {
      prompt: params.prompt,
      ...params.settings,
    };
    if (params.negativePrompt) {
      input.negative_prompt = params.negativePrompt;
    }

    const res = await fetch(`${FAL_API}/${params.apiModel}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`fal.ai error ${res.status}: ${text}`);
    }

    const data = await res.json();

    return {
      externalId: `${params.apiModel}::${data.request_id}`,
      isSync: false,
    };
  },

  async checkStatus(externalId: string): Promise<ProviderStatus> {
    const [modelId, requestId] = externalId.split("::");

    // Check status first
    const statusRes = await fetch(
      `${FAL_API}/${modelId}/requests/${requestId}/status`,
      { headers: getHeaders() }
    );
    const statusData = await statusRes.json();

    if (statusData.status === "COMPLETED") {
      // Fetch result
      const resultRes = await fetch(
        `${FAL_API}/${modelId}/requests/${requestId}`,
        { headers: getHeaders() }
      );
      const resultData = await resultRes.json();

      const resultUrl =
        resultData.images?.[0]?.url ||
        resultData.video?.url ||
        resultData.audio?.url;

      return {
        completed: true,
        failed: false,
        resultUrl,
        metadata: resultData,
      };
    }

    if (statusData.status === "FAILED") {
      return {
        completed: false,
        failed: true,
        error: statusData.error || "Generation failed",
      };
    }

    return { completed: false, failed: false };
  },
};
