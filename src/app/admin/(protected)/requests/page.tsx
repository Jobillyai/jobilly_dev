import { redirect } from "next/navigation";
import { ServiceRequestsPanel } from "@/components/admin/service-requests-panel";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
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
        <AdminPageHeader
          eyebrow="Inbox"
          title="Service requests"
          subtitle={
            isManager
              ? "New candidate signups, unassigned career advisory bookings, and contact form submissions. Assign mentors to new signups and advisory sessions."
              : "Career advisory sessions booked by your assigned candidates. Add meeting remarks and mark closed to send an update to your manager."
          }
        />

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
