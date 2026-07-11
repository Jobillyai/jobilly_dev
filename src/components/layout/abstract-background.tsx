import { PageWaveBackground } from "@/components/layout/page-wave-background";

type AbstractBackgroundProps = {
  className?: string;
};

export function AbstractBackground({ className }: AbstractBackgroundProps) {
  return <PageWaveBackground className={className} />;
}
