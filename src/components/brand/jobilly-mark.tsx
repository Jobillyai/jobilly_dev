"use client";

type JobillyMarkProps = {
  size?: number;
  className?: string;
  gradientId?: string;
};

export function JobillyMark({
  size = 32,
  className,
  gradientId = "jbMarkGrad",
}: JobillyMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#a78bfa" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill={`url(#${gradientId})`} />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fill="#ffffff"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
        fontSize="11"
        fontWeight="800"
        letterSpacing="-0.04em"
      >
        Jb
      </text>
    </svg>
  );
}
