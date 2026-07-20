import { redirect } from "next/navigation";
import { adminApplyForJobsAppliedPath } from "@/lib/admin/apply-for-jobs-paths";

type LegacyCandidateAppliedJobsRedirectProps = {
  params: {
    candidateId: string;
  };
};

export default function LegacyCandidateAppliedJobsRedirect({
  params,
}: LegacyCandidateAppliedJobsRedirectProps) {
  redirect(adminApplyForJobsAppliedPath(params.candidateId));
}
