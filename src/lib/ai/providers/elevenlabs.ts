import type {
  AIProviderClient,
  ProviderSubmitParams,
  ProviderResult,
  ProviderStatus,
} from "../types";

const ELEVEN_API = "https://api.elevenlabs.io/v1";

function getHeaders() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return {
    "xi-api-key": key,
    "Content-Type": "application/json",
  };
}

export const elevenlabsClient: AIProviderClient = {
  async submit(params: ProviderSubmitParams): Promise<ProviderResult> {
    const voiceId = (params.settings.voice_id as string) || "21m00Tcm4TlvDq8ikWAM"; // Rachel default

    const res = await fetch(`${ELEVEN_API}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        text: params.prompt,
        model_id: params.apiModel,
        output_format: "mp3_44100_128",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ElevenLabs error ${res.status}: ${text}`);
    }

    // ElevenLabs TTS is synchronous — returns audio directly
    const buffer = await res.arrayBuffer();

    return {
      resultBuffer: buffer,
      contentType: "audio/mpeg",
      isSync: true,
      metadata: {
        voice_id: voiceId,
        model_id: params.apiModel,
        text_length: params.prompt.length,
      },
    };
  },

  async checkStatus(): Promise<ProviderStatus> {
    // ElevenLabs is synchronous — this should never be called
    return { completed: true, failed: false };
  },
};

// Helper: get available voices
export async function getVoices() {
  const res = await fetch(`${ELEVEN_API}/voices`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch voices");
  return res.json();
}
