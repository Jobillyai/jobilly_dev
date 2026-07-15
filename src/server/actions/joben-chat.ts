"use server";

import type { JobenChatTurn } from "@/lib/joben/joben-prompt";
import {
  enrichJobenReply,
  respondToJobenQuery,
  respondToJobMarketingRequest,
} from "@/lib/joben/public-knowledge";
import { runGeminiJobenChat } from "@/server/services/gemini-joben-chat";

export async function askJobenAction(
  message: string,
  history: JobenChatTurn[] = [],
): Promise<{ content: string } | { error: string }> {
  const trimmed = message.trim();

  if (!trimmed) {
    return { error: "Enter a message." };
  }

  if (trimmed.length > 1000) {
    return { error: "Keep your message under 1,000 characters." };
  }

  const sanitizedHistory = history
    .filter(
      (turn) =>
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string" &&
        turn.content.trim(),
    )
    .slice(-16)
    .map((turn) => ({
      role: turn.role,
      content: turn.content.trim().slice(0, 2000),
    }));

  const aiResult = await runGeminiJobenChat({
    message: trimmed,
    history: sanitizedHistory,
  });

  if ("content" in aiResult) {
    return { content: enrichJobenReply(aiResult.content, trimmed) };
  }

  // Keep high-intent marketing requests useful even when Gemini is unavailable.
  // Normally Gemini handles them so the reply can use context and sound natural.
  const marketingReply = respondToJobMarketingRequest(trimmed);
  if (marketingReply) {
    return { content: marketingReply.content };
  }

  const fallback = respondToJobenQuery(trimmed);
  if (fallback.topicId !== "fallback" && fallback.topicId !== "blocked") {
    return { content: fallback.content };
  }

  return { error: aiResult.error };
}
