import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let entitlementsForPlan: (
  plan: "mock-interviews" | "job-applications" | "mock-and-job" | null,
) => { hasMockInterviews: boolean; hasManagedApplications: boolean };

beforeAll(async () => {
  ({ entitlementsForPlan } = await import(
    "@/server/services/candidate-subscriptions"
  ));
});

describe("resume tailoring plan entitlement", () => {
  it.each([
    [null, false],
    ["mock-interviews", false],
    ["job-applications", true],
    ["mock-and-job", true],
  ] as const)("%s managed-applications access is %s", (plan, expected) => {
    expect(entitlementsForPlan(plan).hasManagedApplications).toBe(expected);
  });
});
