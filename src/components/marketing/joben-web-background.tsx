"use client";

import { useMemo } from "react";
import styles from "./joben-web-background.module.css";

const SPOKES = 14;
const RINGS = 5;

type HubConfig = {
  cx: number;
  cy: number;
  maxRadius: number;
  rotation?: number;
};

function polarPoint(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
): { x: number; y: number } {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function buildRingPolygon(hub: HubConfig, ringIndex: number): string {
  const radius = (hub.maxRadius / RINGS) * ringIndex;
  const rotation = hub.rotation ?? 0;
  const points: string[] = [];

  for (let spoke = 0; spoke <= SPOKES; spoke++) {
    const angle = rotation + (spoke / SPOKES) * Math.PI * 2;
    const { x, y } = polarPoint(hub.cx, hub.cy, radius, angle);
    points.push(`${spoke === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }

  return `${points.join(" ")} Z`;
}

function buildSpokeLine(hub: HubConfig, spokeIndex: number): string {
  const rotation = hub.rotation ?? 0;
  const angle = rotation + (spokeIndex / SPOKES) * Math.PI * 2;
  const inner = polarPoint(hub.cx, hub.cy, hub.maxRadius * 0.08, angle);
  const outer = polarPoint(hub.cx, hub.cy, hub.maxRadius, angle);
  return `M ${inner.x.toFixed(1)} ${inner.y.toFixed(1)} L ${outer.x.toFixed(1)} ${outer.y.toFixed(1)}`;
}

function buildBlockNodes(hub: HubConfig): Array<{ x: number; y: number; size: number }> {
  const nodes: Array<{ x: number; y: number; size: number }> = [];
  const rotation = hub.rotation ?? 0;

  for (let ring = 2; ring <= RINGS; ring += 1) {
    for (let spoke = 0; spoke < SPOKES; spoke += 2) {
      if ((ring + spoke) % 3 !== 0) {
        continue;
      }

      const radius = (hub.maxRadius / RINGS) * ring;
      const angle = rotation + (spoke / SPOKES) * Math.PI * 2;
      const point = polarPoint(hub.cx, hub.cy, radius, angle);
      nodes.push({
        x: point.x,
        y: point.y,
        size: ring === RINGS ? 10 : 8,
      });
    }
  }

  return nodes;
}

function WebHub({ hub, opacity }: { hub: HubConfig; opacity: number }) {
  const spokes = useMemo(
    () => Array.from({ length: SPOKES }, (_, index) => buildSpokeLine(hub, index)),
    [hub],
  );

  const rings = useMemo(
    () =>
      Array.from({ length: RINGS }, (_, index) =>
        buildRingPolygon(hub, index + 1),
      ),
    [hub],
  );

  const blocks = useMemo(() => buildBlockNodes(hub), [hub]);

  return (
    <g style={{ opacity }}>
      {spokes.map((d, index) => (
        <path key={`spoke-${index}`} d={d} className={styles.webLine} />
      ))}
      {rings.map((d, index) => (
        <path key={`ring-${index}`} d={d} className={styles.webLine} />
      ))}
      {blocks.map((block, index) => (
        <rect
          key={`block-${index}`}
          x={block.x - block.size / 2}
          y={block.y - block.size / 2}
          width={block.size}
          height={block.size}
          rx={2.5}
          className={styles.webBlock}
        />
      ))}
      <circle cx={hub.cx} cy={hub.cy} r={5} className={styles.webHub} />
    </g>
  );
}

export function JobenWebBackground({ theme = "light" }: { theme?: "light" | "dark" }) {
  const hubs = useMemo<HubConfig[]>(
    () => [
      { cx: 820, cy: 180, maxRadius: 220, rotation: -0.35 },
      { cx: 160, cy: 760, maxRadius: 200, rotation: 1.1 },
    ],
    [],
  );

  return (
    <div className={styles.root} data-joben-theme={theme} aria-hidden>
      <div className={styles.blockGrid} />
      <svg
        className={styles.svg}
        viewBox="0 0 1000 900"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        {hubs.map((hub, index) => (
          <WebHub key={index} hub={hub} opacity={index === 0 ? 0.9 : 0.75} />
        ))}
        <path
          d="M 820 180 L 640 320 L 480 420 L 300 560 L 160 760"
          className={styles.webConnector}
        />
        <path
          d="M 700 260 L 520 380 L 360 500 L 220 640"
          className={`${styles.webConnector} ${styles.webConnectorAlt}`}
        />
      </svg>
    </div>
  );
}
