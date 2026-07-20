import { redirect } from "next/navigation";
import { adminApplyForJobsCandidatePath } from "@/lib/admin/apply-for-jobs-paths";

type LegacyCandidateJobsRedirectProps = {
  params: {
    candidateId: string;
  };
};

export default function LegacyCandidateJobsRedirect({
  params,
}: LegacyCandidateJobsRedirectProps) {
  redirect(adminApplyForJobsCandidatePath(params.candidateId));
}
