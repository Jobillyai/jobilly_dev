import {
  buildJobenSystemPrompt,
  type JobenChatTurn,
} from "@/lib/joben/joben-prompt";

const DEFAULT_MODEL = "gemini-2.5-flash";

/** Tried in order when the previous model is rate-limited or unavailable.
 *  Each model has its own free-tier quota bucket, so falling back keeps
 *  conversational answers flowing instead of canned one-liners. */
const FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
];

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

function friendlyGeminiError(status: number): string {
  if (status === 429) {
    return "I'm helping a lot of people right now and hit my limit for the moment. Give me a minute and ask again — or explore the site with the buttons below.";
  }
  if (status >= 500) {
    return "I'm having a little trouble thinking right now. Try again in a moment.";
  }
  return "I couldn't process that just now. Please try again.";
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

  // Preserve enough recent turns for natural follow-ups without letting an
  // unusually long conversation crowd out the current request.
  const history = (input.history ?? []).slice(-16);
  const contents = [
    ...history.map((turn) => ({
      role: turn.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: turn.content }],
    })),
    { role: "user" as const, parts: [{ text: input.message }] },
  ];

  const models = [...new Set([getJobenModel(), ...FALLBACK_MODELS])];
  let lastErrorStatus = 500;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    // Generous budget: on Gemini 3 models thinking tokens also count
    // against maxOutputTokens, so leave headroom for the visible reply.
    const generationConfig: Record<string, unknown> = {
      maxOutputTokens: 2048,
      temperature: 0.75,
    };
    if (model.startsWith("gemini-2.5")) {
      // Disable hidden "thinking" tokens on 2.5 models so the full budget
      // goes to the visible reply and answers don't cut off mid-sentence.
      // Older models reject thinkingConfig, so only send it where supported.
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildJobenSystemPrompt() }],
        },
        contents,
        generationConfig,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Joben Gemini error ${response.status} (${model}):`, errorBody.slice(0, 500));
      lastErrorStatus = response.status;
      // Rate limit / overload / unknown model: try the next model in line.
      if (response.status === 429 || response.status >= 500 || response.status === 404) {
        continue;
      }
      return { error: friendlyGeminiError(response.status) };
    }

    const payload = (await response.json()) as GeminiResponse;

    if (payload.error?.message) {
      console.error(`Joben Gemini payload error (${model}):`, payload.error);
      lastErrorStatus = payload.error.code ?? 500;
      continue;
    }

    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim();

    if (!text) {
      lastErrorStatus = 500;
      continue;
    }

    return { content: text };
  }

  return { error: friendlyGeminiError(lastErrorStatus) };
}
