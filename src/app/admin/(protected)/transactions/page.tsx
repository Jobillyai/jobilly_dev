import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  getAdminUser,
  staffIsManager,
  toStaffContext,
} from "@/lib/auth/admin";
import { listCandidateTransactions } from "@/server/services/candidate-transactions";
import adminStyles from "../../admin.module.css";
import styles from "./transactions.module.css";

function formatPaidAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ManagerTransactionsPage() {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/admin/login");
  }

  if (!staffIsManager(toStaffContext(admin))) {
    redirect("/admin");
  }

  const transactions = await listCandidateTransactions();

  return (
    <div className={adminStyles.adminPage}>
      <main className={adminStyles.main}>
        <AdminPageHeader
          eyebrow="Billing"
          title="Transactions"
          subtitle="Manager-only view of candidate mock payments and PDF acknowledgements."
        />

        {transactions.length === 0 ? (
          <div className={adminStyles.emptyState}>No successful plan transactions yet.</div>
        ) : (
          <div className={adminStyles.tableWrap}>
            <table className={adminStyles.table}>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Candidate</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Receipt email</th>
                  <th>Acknowledgement</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      <strong className={styles.reference}>
                        {transaction.transactionReference}
                      </strong>
                      <span className={styles.receipt}>{transaction.receiptNumber}</span>
                    </td>
                    <td>
                      <strong>{transaction.candidateName}</strong>
                      <span className={styles.email}>{transaction.candidateEmail}</span>
                    </td>
                    <td>
                      {transaction.planTitle}
                      <span className={styles.status}>{transaction.status}</span>
                    </td>
                    <td>
                      {transaction.currency} {transaction.amountUsd.toFixed(2)}
                    </td>
                    <td>{formatPaidAt(transaction.paidAt)}</td>
                    <td>{transaction.receiptEmailedAt ? "Sent" : "Not sent"}</td>
                    <td>
                      <a
                        href={`/api/admin/transactions/${transaction.id}/receipt`}
                        className={styles.download}
                      >
                        <Download size={15} aria-hidden />
                        PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
