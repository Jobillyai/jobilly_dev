import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";
import { getCandidateProfile } from "@/server/services/candidate-service";

/**
 * Pattern: mock the Supabase client's query builder chain, assert the
 * service function calls the right table/filter and returns the right
 * shape. Because services are the only code touching `.from(...)`, this is
 * also where you'd catch an accidental query against the wrong table.
 *
 * The mock only implements the chain methods this service actually calls,
 * so it's cast through `unknown` rather than matching the full real client
 * type — that's an intentional, narrow escape hatch for test doubles, not a
 * blanket `any`.
 */
describe("getCandidateProfile", () => {
  it("queries candidate_profiles filtered by user_id and returns the row", async () => {
    const mockProfile = { user_id: "user-1", education: "BS Computer Science" };

    const single = vi.fn().mockResolvedValue({ data: mockProfile, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const mockDb = { from } as unknown as SupabaseClient<Database>;

    const result = await getCandidateProfile(mockDb, "user-1");

    expect(from).toHaveBeenCalledWith("candidate_profiles");
    expect(select).toHaveBeenCalledWith("*");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(result).toEqual(mockProfile);
  });

  it("throws if Supabase returns an error", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: new Error("not found") });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const mockDb = { from } as unknown as SupabaseClient<Database>;

    await expect(getCandidateProfile(mockDb, "missing-user")).rejects.toThrow("not found");
  });
});
