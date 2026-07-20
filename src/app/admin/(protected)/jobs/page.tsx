import { redirect } from "next/navigation";
import { ADMIN_APPLY_FOR_JOBS_HREF } from "@/lib/admin/apply-for-jobs-paths";

export default function AdminJobsRedirectPage() {
  redirect(ADMIN_APPLY_FOR_JOBS_HREF);
}
