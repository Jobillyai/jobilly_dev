import type { CSSProperties } from "react";
import { AbstractBackground } from "@/components/layout/abstract-background";
import styles from "./auth-background.module.css";

const floatingCards = [
  { title: "Career Advisory", detail: "Expert mentor sessions", tone: styles.cardBlue, motion: styles.floatA, delay: "0s", position: styles.cardLeftTop },
  { title: "Growth School", detail: "AI micro-lessons & quizzes", tone: styles.cardGreen, motion: styles.floatB, delay: "0.8s", position: styles.cardRightMid },
  { title: "Mock Interviews", detail: "Voice AI with company personas", tone: styles.cardPurple, motion: styles.floatC, delay: "1.6s", position: styles.cardRightBottom },
  { title: "We apply for you", detail: "Jobs on your behalf", tone: styles.cardViolet, motion: styles.floatD, delay: "2.4s", position: styles.cardLeftBottom },
];

export function AuthBackground() {
  return (
    <>
      <AbstractBackground />
      <div className={styles.floatingCards} aria-hidden>
        {floatingCards.map((card) => (
          <div
            key={card.title}
            className={`${styles.floatingCard} ${card.tone} ${card.motion} ${card.position}`}
            style={{ "--float-delay": card.delay } as CSSProperties}
          >
            <span className={styles.floatingCardTitle}>{card.title}</span>
            <span className={styles.floatingCardDetail}>{card.detail}</span>
          </div>
        ))}
      </div>
    </>
  );
}
