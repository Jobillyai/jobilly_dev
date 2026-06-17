import { createTRPCRouter } from "@/server/api/trpc";
import { candidateRouter } from "@/server/api/routers/candidate";

/**
 * Root router. Add one sub-router per domain as features are built:
 * advisory, learning, interviews, jobApplications, institutions, admin...
 * Each maps to a file in `routers/` backed by a file in `services/`.
 */
export const appRouter = createTRPCRouter({
  candidate: candidateRouter,
});

export type AppRouter = typeof appRouter;
