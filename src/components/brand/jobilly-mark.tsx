"use client";

type JobillyMarkProps = {
  size?: number;
  className?: string;
};

/** Intrinsic aspect of the arrow mark. */
export const JOBILLY_MARK_ASPECT = 348 / 174;

export function getJobillyMarkDimensions(size: number) {
  const height = size;
  const width = size * JOBILLY_MARK_ASPECT;

  return { width, height };
}

export function JobillyMark({ size = 32, className }: JobillyMarkProps) {
  const { width, height } = getJobillyMarkDimensions(size);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- local brand PNG, sized explicitly
    <img
      src="/brand/jobilly-mark-arrow.png"
      alt=""
      width={Math.round(width)}
      height={Math.round(height)}
      className={className}
      draggable={false}
    />
  );
}
