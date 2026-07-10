"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./welcome-hero-mesh.module.css";

type WaveDirection = "bl-tr" | "tl-br";
type WaveExtent = "normal" | "far" | "strip";

type WelcomeWaveMeshProps = {
  direction?: WaveDirection;
  lineCount?: number;
  extent?: WaveExtent;
};

const SEGMENTS = 180;

function getSpineParams(direction: WaveDirection, extent: WaveExtent) {
  if (direction === "bl-tr" && extent === "strip") {
    return { xStart: -240, xSpan: 1640, yStart: 760, ySpan: 980 };
  }

  if (direction === "bl-tr" && extent === "far") {
    return { xStart: -240, xSpan: 1760, yStart: 860, ySpan: 1120 };
  }

  if (direction === "bl-tr") {
    return { xStart: -120, xSpan: 1440, yStart: 700, ySpan: 920 };
  }

  return { xStart: -120, xSpan: 1440, yStart: -80, ySpan: 920 };
}

function spine(t: number, direction: WaveDirection, extent: WaveExtent) {
  const { xStart, xSpan, yStart, ySpan } = getSpineParams(direction, extent);
  const x = xStart + t * xSpan;
  const baseY = direction === "bl-tr" ? yStart - t * ySpan : yStart + t * ySpan;
  const y =
    baseY +
    Math.sin(t * Math.PI * 2.2) * 48 +
    Math.sin(t * Math.PI * 5.6 + 0.6) * 16 +
    Math.sin(t * Math.PI * 9.2 + 1.1) * 6;

  return { x, y };
}

function perpendicular(t: number, direction: WaveDirection, extent: WaveExtent) {
  const delta = 0.008;
  const before = spine(Math.max(0, t - delta), direction, extent);
  const after = spine(Math.min(1, t + delta), direction, extent);
  const dx = after.x - before.x;
  const dy = after.y - before.y;
  const length = Math.hypot(dx, dy) || 1;

  return { nx: -dy / length, ny: dx / length };
}

function buildWavePath(
  lineIndex: number,
  lineCount: number,
  direction: WaveDirection,
  extent: WaveExtent,
) {
  const offset = (lineIndex - lineCount / 2) * 2.6;
  const points: string[] = [];

  for (let step = 0; step <= SEGMENTS; step++) {
    const t = step / SEGMENTS;
    const { x, y } = spine(t, direction, extent);
    const { nx, ny } = perpendicular(t, direction, extent);
    const ripple =
      Math.sin(t * Math.PI * 14 + lineIndex * 0.22) * 2.2 +
      Math.sin(t * Math.PI * 22 + lineIndex * 0.11) * 0.9;

    const px = x + nx * (offset + ripple);
    const py = y + ny * (offset + ripple);

    points.push(`${step === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`);
  }

  return points.join(" ");
}

export function WelcomeWaveMesh({
  direction = "bl-tr",
  lineCount = 64,
  extent = "normal",
}: WelcomeWaveMeshProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const paths = useMemo(
    () =>
      Array.from({ length: lineCount }, (_, index) =>
        buildWavePath(index, lineCount, direction, extent),
      ),
    [direction, extent, lineCount],
  );

  const revealClass =
    direction === "tl-br" ? styles.meshRevealTlBr : styles.meshRevealBlTr;
  const extentClass =
    extent === "strip"
      ? styles.meshWrapStrip
      : extent === "far"
        ? styles.meshWrapFar
        : "";

  const preserveAspectRatio =
    extent === "strip" || extent === "far"
      ? "xMinYMax slice"
      : "xMidYMid slice";

  return (
    <div
      className={`${styles.meshWrap} ${extentClass} ${reducedMotion ? styles.meshWrapStatic : revealClass}`}
      aria-hidden
    >
      <svg
        className={styles.mesh}
        viewBox="0 0 1200 700"
        preserveAspectRatio={preserveAspectRatio}
        role="presentation"
      >
        {paths.map((d, index) => (
          <path
            key={index}
            d={d}
            fill="none"
            className={styles.meshLine}
            style={{ opacity: 0.3 + (index % 5) * 0.045 }}
          />
        ))}
      </svg>
    </div>
  );
}

export function WelcomeHeroMesh() {
  return <WelcomeWaveMesh direction="bl-tr" lineCount={64} />;
}
