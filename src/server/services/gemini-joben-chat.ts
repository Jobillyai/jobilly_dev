import {
  buildJobenSystemPrompt,
  type JobenChatTurn,
} from "@/lib/joben/joben-prompt";

const DEFAULT_MODEL = "gemini-2.5-flash";

function getGeminiApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    null
  );
}

function getJobenModel(): string {
  return process.env.JOBEN_GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string; code?: number };
};

export async function runGeminiJobenChat(input: {
  message: string;
  history?: JobenChatTurn[];
}): Promise<{ content: string } | { error: string }> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return {
      error: "Add GEMINI_API_KEY to your .env.local file to enable Joben.",
    };
  }

  const history = (input.history ?? []).slice(-10);
  const contents = [
    ...history.map((turn) => ({
      role: turn.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: turn.content }],
    })),
    { role: "user" as const, parts: [{ text: input.message }] },
  ];

  const model = getJobenModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: buildJobenSystemPrompt() }],
      },
      contents,
      generationConfig: {
        maxOutputTokens: 400,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      error: `Joben could not respond (${response.status}). ${errorBody.slice(0, 160)}`,
    };
  }

  const payload = (await response.json()) as GeminiResponse;

  if (payload.error?.message) {
    return { error: payload.error.message };
  }

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    return { error: "Joben received an empty response. Try again." };
  }

  return { content: text };
}
