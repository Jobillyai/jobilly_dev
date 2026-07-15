import { Clock } from "lucide-react";
import { CandidateLocalTime } from "./candidate-local-time";
import styles from "./candidate-time-widget.module.css";

type CandidateTimeWidgetProps = {
  location: string | null;
  timezone: string | null;
};

/** Card showing the candidate's location and live local time. */
export function CandidateTimeWidget({ location, timezone }: CandidateTimeWidgetProps) {
  if (!timezone) {
    return null;
  }

  return (
    <div className={styles.widget}>
      <span className={styles.icon} aria-hidden>
        <Clock size={20} strokeWidth={2.2} />
      </span>
      <div className={styles.meta}>
        <span className={styles.label}>
          {location ? `${location} · local time` : "Candidate local time"}
        </span>
        <CandidateLocalTime timezone={timezone} className={styles.time} />
      </div>
    </div>
  );
}
