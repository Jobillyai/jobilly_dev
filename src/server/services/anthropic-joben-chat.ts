import {
  buildJobenSystemPrompt,
  type JobenChatTurn,
} from "@/lib/joben/joben-prompt";

const DEFAULT_MODEL = "claude-3-5-haiku-latest";

function getAnthropicApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY?.trim() || null;
}

function getJobenModel(): string {
  return process.env.JOBEN_ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

export async function runAnthropicJobenChat(input: {
  message: string;
  history?: JobenChatTurn[];
}): Promise<{ content: string } | { error: string }> {
  const apiKey = getAnthropicApiKey();

  if (!apiKey) {
    return {
      error: "Add ANTHROPIC_API_KEY to your .env.local file to enable Joben.",
    };
  }

  const history = (input.history ?? []).slice(-10);
  const messages = [
    ...history.map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
    { role: "user" as const, content: input.message },
  ];

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getJobenModel(),
      max_tokens: 400,
      system: buildJobenSystemPrompt(),
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      error: `Joben could not respond (${response.status}). ${errorBody.slice(0, 160)}`,
    };
  }

  const payload = (await response.json()) as AnthropicResponse;

  if (payload.error?.message) {
    return { error: payload.error.message };
  }

  const text = payload.content
    ?.filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    return { error: "Joben received an empty response. Try again." };
  }

  return { content: text };
}
