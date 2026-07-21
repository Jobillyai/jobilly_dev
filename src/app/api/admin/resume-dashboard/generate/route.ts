import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/auth/admin";
import { geminiGenerateText } from "@/server/services/gemini-generate";

export const maxDuration = 120;

const bodySchema = z.object({
  prompt: z.string().min(1).max(200_000),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.number().int().min(256).max(32_768).optional(),
});

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request. Provide a non-empty prompt." },
      { status: 400 },
    );
  }

  const result = await geminiGenerateText({
    prompt: parsed.data.prompt,
    temperature: parsed.data.temperature ?? 0.3,
    maxOutputTokens: parsed.data.maxOutputTokens ?? 8192,
    timeoutMs: 90_000,
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: { message: result.error } },
      { status: result.status && result.status >= 400 ? result.status : 502 },
    );
  }

  return NextResponse.json({
    text: result.text,
    model: result.model,
  });
}
