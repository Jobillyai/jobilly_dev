import { ArcadeBackground } from "@/components/layout/arcade-background";

type AbstractBackgroundArtProps = {
  className?: string;
};

/** Decorative background for marketing pages — Arcade Enterprise mesh style. */
export function AbstractBackgroundArt({ className }: AbstractBackgroundArtProps) {
  return <ArcadeBackground className={className} />;
}
