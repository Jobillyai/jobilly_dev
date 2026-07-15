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
        maxOutputTokens: 1024,
        temperature: 0.7,
        // Disable hidden "thinking" tokens on 2.5-flash so the full budget
        // goes to the visible reply and answers don't cut off mid-sentence.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Joben Gemini error ${response.status}:`, errorBody.slice(0, 500));
    return { error: friendlyGeminiError(response.status) };
  }

  const payload = (await response.json()) as GeminiResponse;

  if (payload.error?.message) {
    console.error("Joben Gemini payload error:", payload.error);
    return { error: friendlyGeminiError(payload.error.code ?? 500) };
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
