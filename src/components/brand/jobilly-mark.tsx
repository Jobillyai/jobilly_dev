"use client";

import {
  JOBILLY_MARK_VIEWBOX,
  jobillyMarkPaths,
} from "./jobilly-mark-paths";

type JobillyMarkProps = {
  size?: number;
  className?: string;
};

export function getJobillyMarkDimensions(size: number) {
  const height = size;
  const width = (size * JOBILLY_MARK_VIEWBOX.width) / JOBILLY_MARK_VIEWBOX.height;

  return { width, height };
}

export function JobillyMark({ size = 32, className }: JobillyMarkProps) {
  const { width, height } = getJobillyMarkDimensions(size);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${JOBILLY_MARK_VIEWBOX.width} ${JOBILLY_MARK_VIEWBOX.height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {jobillyMarkPaths.map((path, index) => (
        <path
          key={index}
          d={path.d}
          fill={path.fill}
          {...(path.transform ? { transform: path.transform } : {})}
        />
      ))}
    </svg>
  );
}
