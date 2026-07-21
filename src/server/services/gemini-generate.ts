import "server-only";

/** Prefer models known to work with AI Studio keys; avoid quota-exhausted aliases first. */
const DEFAULT_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-2.0-flash",
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
  // AI Studio / Generative Language API — correct host for AIza… and AQ.… keys.
  const urls = [
    `https://generativelanguage.googleapis.com/v1beta/models/${encodedModel}:generateContent?key=${encodedKey}`,
  ];

  // Vertex only when a GCP project is configured (API-key Vertex is usually disabled).
  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  if (project) {
    urls.push(
      `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodedModel}:generateContent?key=${encodedKey}`,
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/us-central1/publishers/google/models/${encodedModel}:generateContent?key=${encodedKey}`,
    );
  }

  return urls;
}

function summarizeGeminiFailure(
  status: number | undefined,
  detail: string,
  kind: "generation" | "classification" = "generation",
): string {
  const lower = detail.toLowerCase();
  if (
    lower.includes("unregistered callers") ||
    lower.includes("without established identity")
  ) {
    return "Gemini rejected the request as unauthenticated. Set GEMINI_API_KEY on the server (Vercel → Environment Variables → Production) and redeploy.";
  }
  if (status === 429 || lower.includes("quota") || lower.includes("rate")) {
    return "Gemini is rate-limited or out of quota. Retry shortly, or use a different AI Studio key/plan.";
  }
  if (status === 401 || status === 403) {
    return "Gemini API key was rejected. Create a key at aistudio.google.com and set GEMINI_API_KEY on the server.";
  }
  if (detail) {
    return `Gemini ${kind} failed (${status ?? "unknown"}): ${detail.slice(0, 280)}`;
  }
  return `Gemini ${kind} failed. Check GEMINI_API_KEY and API access.`;
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

  return {
    error: summarizeGeminiFailure(lastStatus, lastDetail, "classification"),
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

  return {
    error: summarizeGeminiFailure(lastStatus, lastDetail),
    status: lastStatus,
  };
}
