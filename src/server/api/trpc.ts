import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { createClient } from "@/server/db/supabase-server";

/**
 * Per-request context available to every tRPC procedure. This is the only
 * place route handlers reach into Supabase directly — everything downstream
 * (routers, services) consumes `ctx`, never the database client straight
 * from a component. That indirection is what lets us extract a router into
 * its own microservice later without touching the database schema.
 */
export async function createTRPCContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return {
    supabase,
    user: data.user ?? null,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;

/** Public procedure — no auth required (e.g. checking institution branding by subdomain). */
export const publicProcedure = t.procedure;

/**
 * Auth-gated procedure. Throws UNAUTHORIZED if there's no session. This is
 * an app-layer convenience check, not a security boundary on its own —
 * every query still passes through Postgres RLS as the real enforcement
 * layer, so a bug here can't expose another user's rows.
 */
const enforceAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuthed);

/**
 * Role-gated procedure factory. Reads the user's role from their profile
 * row (RLS-governed) and rejects if it isn't in the allowed list. Use for
 * admin/employee-only routers (e.g. internal candidate dashboard, scraper
 * triggers). Layered on top of Postgres role policies, not a replacement
 * for them.
 */
export function roleProtectedProcedure(allowedRoles: string[]) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const { data: profile } = await ctx.supabase
      .from("users")
      .select("role")
      .eq("id", ctx.user.id)
      .single();

    if (!profile || !allowedRoles.includes(profile.role)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return next({ ctx });
  });
}
