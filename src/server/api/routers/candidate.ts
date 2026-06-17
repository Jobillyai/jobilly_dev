import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import * as candidateService from "@/server/services/candidate-service";

/**
 * Routers stay thin: validate input with Zod, delegate to a service
 * function, return the result. No business logic and no raw table access
 * here — see `server/services/candidate-service.ts`.
 */
export const candidateRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return candidateService.getCandidateProfile(ctx.supabase, ctx.user.id);
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        education: z.string().min(1).max(500).optional(),
        skills: z.array(z.string().min(1).max(50)).max(50).optional(),
        interests: z.array(z.string().min(1).max(50)).max(50).optional(),
        careerGoals: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return candidateService.updateCandidateProfile(
        ctx.supabase,
        ctx.user.id,
        input,
      );
    }),
});
