import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

export type RateLimitOutcome = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

type LimiterKey =
  | "loginIp"
  | "loginEmail"
  | "adminLoginIp"
  | "adminLoginEmail"
  | "passwordResetIp"
  | "passwordResetEmail"
  | "updatePasswordIp"
  | "contactFormIp"
  | "contactFormEmail";

const LIMITER_CONFIG: Record<
  LimiterKey,
  { requests: number; window: `${number} ${"s" | "m" | "h" | "d"}` }
> = {
  loginIp: { requests: 10, window: "15 m" },
  loginEmail: { requests: 5, window: "15 m" },
  adminLoginIp: { requests: 10, window: "15 m" },
  adminLoginEmail: { requests: 5, window: "15 m" },
  passwordResetIp: { requests: 5, window: "1 h" },
  passwordResetEmail: { requests: 3, window: "1 h" },
  updatePasswordIp: { requests: 10, window: "1 h" },
  contactFormIp: { requests: 5, window: "1 h" },
  contactFormEmail: { requests: 3, window: "1 h" },
};

function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

let redisClient: Redis | null = null;
const limiterCache = new Map<LimiterKey, Ratelimit>();

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

function getLimiter(key: LimiterKey): Ratelimit {
  const cached = limiterCache.get(key);
  if (cached) {
    return cached;
  }

  const config = LIMITER_CONFIG[key];
  const limiter = new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: `jobilly:${key}`,
  });

  limiterCache.set(key, limiter);
  return limiter;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

export async function getRequestIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return headerList.get("x-real-ip") ?? "unknown";
}

export function rateLimitErrorMessage(retryAfterSeconds?: number): string {
  if (retryAfterSeconds !== undefined && retryAfterSeconds < 120) {
    return `Too many attempts. Try again in ${retryAfterSeconds} seconds.`;
  }

  const minutes = Math.max(1, Math.ceil((retryAfterSeconds ?? 900) / 60));
  return `Too many attempts. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

async function withRateLimitTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs = 2500,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

export async function checkRateLimit(
  limiterKey: LimiterKey,
  identifier: string,
): Promise<RateLimitOutcome> {
  if (!isUpstashConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[rate-limit] Upstash is not configured; skipping ${limiterKey} for ${identifier}`,
      );
    }
    return { allowed: true };
  }

  const limiter = getLimiter(limiterKey);

  try {
    const result = await withRateLimitTimeout(limiter.limit(identifier), {
      success: true,
      reset: Date.now(),
      limit: LIMITER_CONFIG[limiterKey].requests,
      remaining: LIMITER_CONFIG[limiterKey].requests,
      pending: Promise.resolve(),
    });

    if (!result.success) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(result.reset),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.warn(`[rate-limit] ${limiterKey} failed open:`, error);
    return { allowed: true };
  }
}

async function enforceDualRateLimits(
  ipLimiterKey: LimiterKey,
  emailLimiterKey: LimiterKey,
  email: string,
): Promise<RateLimitOutcome> {
  const ip = await getRequestIp();
  const [ipResult, emailResult] = await Promise.all([
    checkRateLimit(ipLimiterKey, ip),
    checkRateLimit(emailLimiterKey, normalizeEmail(email)),
  ]);

  if (!ipResult.allowed) {
    return ipResult;
  }

  return emailResult;
}

export async function enforceLoginRateLimits(
  scope: "candidate" | "admin",
  email: string,
): Promise<RateLimitOutcome> {
  if (scope === "admin") {
    return enforceDualRateLimits("adminLoginIp", "adminLoginEmail", email);
  }

  return enforceDualRateLimits("loginIp", "loginEmail", email);
}

export async function enforcePasswordResetRateLimits(
  email: string,
): Promise<RateLimitOutcome> {
  return enforceDualRateLimits(
    "passwordResetIp",
    "passwordResetEmail",
    email,
  );
}

export async function enforceUpdatePasswordRateLimits(): Promise<RateLimitOutcome> {
  const ip = await getRequestIp();
  return checkRateLimit("updatePasswordIp", ip);
}
