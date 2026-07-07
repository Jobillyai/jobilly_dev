import { redirect } from "next/navigation";
import { ServiceRequestsPanel } from "@/components/admin/service-requests-panel";
import {
  getAdminUser,
  staffIsManager,
  toStaffContext,
} from "@/lib/auth/admin";
import {
  listMentorAdmins,
  listServiceRequests,
} from "@/server/services/service-requests";
import styles from "../../admin.module.css";

export default async function AdminServiceRequestsPage() {
  const admin = await getAdminUser();

  if (!admin) {
    redirect("/admin/login");
  }

  const staff = toStaffContext(admin);
  const isManager = staffIsManager(staff);
  const [requests, mentors] = await Promise.all([
    listServiceRequests(staff),
    isManager ? listMentorAdmins() : Promise.resolve([]),
  ]);

  return (
    <div className={styles.adminPage}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Service <em className={styles.titleEm}>requests</em>
          </h1>
          <p className={styles.subtitle}>
            {isManager
              ? "New candidate signups and contact form submissions appear here. Assign each new signup to a mentor admin."
              : "Requests assigned to you by the manager. Mark them closed when resolved."}
          </p>
        </div>

        <section className={styles.section}>
          <ServiceRequestsPanel
            requests={requests}
            mentors={mentors}
            isManager={isManager}
          />
        </section>
      </main>
    </div>
  );
}
