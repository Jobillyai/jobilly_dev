import { USE_ABSTRACT_BACKGROUNDS } from "@/lib/ui/background-style";
import { AbstractBackgroundArt } from "@/components/layout/abstract-background-art";
import styles from "./abstract-background.module.css";

type AbstractBackgroundProps = {
  className?: string;
};

export function AbstractBackground({ className }: AbstractBackgroundProps) {
  if (USE_ABSTRACT_BACKGROUNDS) {
    return <AbstractBackgroundArt className={className} />;
  }

  return (
    <div className={`${styles.plainBackground} ${className ?? ""}`.trim()} aria-hidden />
  );
}
