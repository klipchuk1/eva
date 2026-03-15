import type {
  AIProviderClient,
  ProviderSubmitParams,
  ProviderResult,
  ProviderStatus,
} from "../types";

const PROXY_URL = process.env.GEMINI_PROXY_URL!;
const PROXY_SECRET = process.env.GEMINI_PROXY_SECRET!;

export const geminiClient: AIProviderClient = {
  async submit(params: ProviderSubmitParams): Promise<ProviderResult> {
    const response = await fetch(`${PROXY_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-proxy-secret": PROXY_SECRET,
      },
      body: JSON.stringify({
        model: params.apiModel,
        contents: [{ parts: [{ text: params.prompt }] }],
        generationConfig: { responseModalities: ["image", "text"] },
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message ?? JSON.stringify(data.error));
    }

    const imagePart = data.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData
    );

    if (!imagePart?.inlineData) {
      throw new Error("No image in Gemini response");
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(imagePart.inlineData.data, "base64");

    return {
      resultBuffer: buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ),
      contentType: imagePart.inlineData.mimeType || "image/png",
      isSync: true,
    };
  },

  async checkStatus(): Promise<ProviderStatus> {
    // Gemini via proxy is synchronous
    return { completed: true, failed: false };
  },
};
