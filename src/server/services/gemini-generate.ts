import "server-only";

const DEFAULT_MODELS = [
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
] as const;

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string; code?: number };
};

export function getGeminiApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    null
  );
}

function geminiUrls(model: string, apiKey: string): string[] {
  const encodedModel = encodeURIComponent(model);
  const encodedKey = encodeURIComponent(apiKey);
  const urls = [
    `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent?key=${encodedKey}`,
    `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodedModel}:generateContent?key=${encodedKey}`,
  ];

  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  if (project) {
    urls.push(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/us-central1/publishers/google/models/${encodedModel}:generateContent?key=${encodedKey}`,
    );
  }

  return urls;
}

function extractResponseText(body: GeminiResponse): string | null {
  const text = body.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
  return text || null;
}

export function parseGeminiJsonText(text: string): unknown {
  return JSON.parse(
    text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim(),
  );
}

export async function geminiGenerateJson(input: {
  prompt: string;
  models?: readonly string[];
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<
  | { text: string; model: string; endpoint: string }
  | { error: string; status?: number }
> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { error: "GEMINI_API_KEY is not configured." };
  }

  const models = input.models ?? DEFAULT_MODELS;
  let lastStatus: number | undefined;
  let lastDetail = "";

  for (const model of models) {
    const generationConfig: Record<string, unknown> = {
      temperature: input.temperature ?? 0,
      maxOutputTokens: input.maxOutputTokens ?? 4096,
      responseMimeType: "application/json",
    };
    if (model.startsWith("gemini-2.5")) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    for (const url of geminiUrls(model, apiKey)) {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        input.timeoutMs ?? 45_000,
      );

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: input.prompt }] }],
            generationConfig,
          }),
        });

        if (!response.ok) {
          lastStatus = response.status;
          lastDetail = (await response.text()).slice(0, 240);
          console.error(
            `Gemini request failed (${response.status}, ${model}):`,
            lastDetail,
          );
          if (response.status === 429 || response.status >= 500) {
            continue;
          }
          continue;
        }

        const body = (await response.json()) as GeminiResponse;
        if (body.error?.message) {
          lastStatus = body.error.code ?? 500;
          lastDetail = body.error.message;
          console.error(`Gemini payload error (${model}):`, body.error);
          continue;
        }

        const text = extractResponseText(body);
        if (!text) {
          lastStatus = 500;
          lastDetail = "Empty Gemini response.";
          continue;
        }

        return { text, model, endpoint: url.split("?")[0] ?? url };
      } catch (error) {
        lastStatus = error instanceof Error && error.name === "AbortError" ? 408 : 500;
        lastDetail =
          error instanceof Error ? error.message : "Could not reach Gemini.";
        console.error(`Gemini fetch error (${model}):`, lastDetail);
      } finally {
        clearTimeout(timer);
      }
    }
  }

  if (lastStatus === 429) {
    return { error: "Gemini is rate-limited. Retry in a minute.", status: 429 };
  }
  if (lastStatus === 401 || lastStatus === 403) {
    return {
      error:
        "Gemini API key was rejected. Enable Generative Language API on the Google Cloud project or use a valid AI Studio key.",
      status: lastStatus,
    };
  }

  return {
    error: lastDetail
      ? `Gemini classification failed (${lastStatus ?? "unknown"}): ${lastDetail}`
      : "Gemini classification failed. Check GEMINI_API_KEY and API access.",
    status: lastStatus,
  };
}

/** Free-text Gemini generation (resume rewrite, etc.). */
export async function geminiGenerateText(input: {
  prompt: string;
  models?: readonly string[];
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<
  | { text: string; model: string; endpoint: string }
  | { error: string; status?: number }
> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return { error: "GEMINI_API_KEY is not configured." };
  }

  const models = input.models ?? DEFAULT_MODELS;
  let lastStatus: number | undefined;
  let lastDetail = "";

  for (const model of models) {
    const generationConfig: Record<string, unknown> = {
      temperature: input.temperature ?? 0.3,
      maxOutputTokens: input.maxOutputTokens ?? 8192,
    };
    if (model.startsWith("gemini-2.5")) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    for (const url of geminiUrls(model, apiKey)) {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        input.timeoutMs ?? 90_000,
      );

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: input.prompt }] }],
            generationConfig,
          }),
        });

        if (!response.ok) {
          lastStatus = response.status;
          lastDetail = (await response.text()).slice(0, 240);
          console.error(
            `Gemini text request failed (${response.status}, ${model}):`,
            lastDetail,
          );
          continue;
        }

        const body = (await response.json()) as GeminiResponse;
        if (body.error?.message) {
          lastStatus = body.error.code ?? 500;
          lastDetail = body.error.message;
          console.error(`Gemini text payload error (${model}):`, body.error);
          continue;
        }

        const text = extractResponseText(body);
        if (!text) {
          lastStatus = 500;
          lastDetail = "Empty Gemini response.";
          continue;
        }

        return { text, model, endpoint: url.split("?")[0] ?? url };
      } catch (error) {
        lastStatus = error instanceof Error && error.name === "AbortError" ? 408 : 500;
        lastDetail =
          error instanceof Error ? error.message : "Could not reach Gemini.";
        console.error(`Gemini text fetch error (${model}):`, lastDetail);
      } finally {
        clearTimeout(timer);
      }
    }
  }

  if (lastStatus === 429) {
    return { error: "Gemini is rate-limited. Retry in a minute.", status: 429 };
  }
  if (lastStatus === 401 || lastStatus === 403) {
    return {
      error:
        "Gemini API key was rejected. Enable Generative Language API on the Google Cloud project or use a valid AI Studio key.",
      status: lastStatus,
    };
  }

  return {
    error: lastDetail
      ? `Gemini generation failed (${lastStatus ?? "unknown"}): ${lastDetail}`
      : "Gemini generation failed. Check GEMINI_API_KEY and API access.",
    status: lastStatus,
  };
}
