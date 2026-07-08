"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import styles from "./arrow-loader.module.css";

const TRAIL_COUNT = 8;
const SONIC_COUNT = 14;
const DROPLET_COUNT = 6;
const MIST_COUNT = 8;
const LOOP_DURATION = 1.05;

const forwardTransition = {
  duration: LOOP_DURATION,
  repeat: Infinity,
  ease: "easeInOut" as const,
};

const CYCLE_TIMES = [0, 0.14, 0.52, 0.8, 0.86, 1] as const;
const FOLLOW_X = [0, 0, 118, 118, 0, 0] as const;

function staggerTimes(lag: number) {
  return CYCLE_TIMES.map((time, index) =>
    index >= 2 && index <= 3 ? Math.min(0.98, time + lag) : time,
  );
}

const followEase = ["easeOut", "linear", "easeInOut", "easeOut", "easeIn"] as const;

/** Full cycle: nowhere → fade in at front → travel right → fade out → invisibly return to front */
const arrowCycle = {
  x: [0, 0, 118, 118, 0],
  opacity: [0, 1, 1, 0, 0],
  filter: ["blur(8px)", "blur(0px)", "blur(0px)", "blur(8px)", "blur(8px)"],
};

const arrowTransition = {
  duration: LOOP_DURATION,
  repeat: Infinity,
  times: [0, 0.14, 0.72, 0.86, 1],
  ease: ["easeOut", "easeInOut", "easeIn", "linear"] as const,
};

function sonicMotion(id: number) {
  const lag = id * 0.011;
  const stretch = 2.2 + (id % 5) * 0.45;

  return {
    animate: {
      x: [...FOLLOW_X],
      opacity: [0, 0, 0.95, 0.95, 0, 0],
      scaleX: [0.12, 0.12, 0.55, stretch, 0.12, 0.12],
    },
    transition: {
      duration: LOOP_DURATION,
      repeat: Infinity,
      times: staggerTimes(lag),
      ease: followEase,
    },
  };
}

function dropletMotion(id: number, drift: number) {
  const lag = id * 0.014;
  const behind = id * 3.5;

  return {
    animate: {
      x: [0, 0, 118 - behind, 118 - behind * 1.6, 0, 0],
      y: [0, 0, 0, drift * 0.2, 0, 0],
      opacity: [0, 0, 0.95, 0.35, 0, 0],
      scaleX: [0.7, 0.7, 1, 2.3 + (id % 3) * 0.35, 0.7, 0.7],
      scaleY: [1, 1, 1, 0.55, 1, 1],
    },
    transition: {
      duration: LOOP_DURATION,
      repeat: Infinity,
      times: staggerTimes(lag),
      ease: followEase,
    },
  };
}

function mistMotion(id: number) {
  const lag = id * 0.016;
  const behind = id * 4.5;
  const stretch = 3.2 + (id % 4) * 0.55;

  return {
    animate: {
      x: [0, 0, 118 - behind * 0.7, 118 - behind * 1.35, 0, 0],
      y: [0, 0, ((id % 5) - 2) * 1.5, ((id * 3) % 7) - 3, 0, 0],
      opacity: [0, 0, 0.38, 0.08, 0, 0],
      scaleX: [0.45, 0.45, 0.85, stretch, 0.45, 0.45],
      scaleY: [0.75, 0.75, 1.15, 0.65, 0.75, 0.75],
    },
    transition: {
      duration: LOOP_DURATION,
      repeat: Infinity,
      times: staggerTimes(lag),
      ease: followEase,
    },
  };
}

const trailLayers = [styles.layer1, styles.layer2, styles.layer3] as const;

const trails = Array.from({ length: TRAIL_COUNT }, (_, i) => ({ id: i }));
const sonicLines = Array.from({ length: SONIC_COUNT }, (_, i) => ({
  id: i,
  angle: ((i * 11) % 23) - 11,
  width: 42 + (i % 5) * 10,
  top: `calc(50% + ${((i * 4) % 13) - 6}px)`,
}));
const droplets = Array.from({ length: DROPLET_COUNT }, (_, i) => ({
  id: i,
  top: `calc(50% + ${((i % 4) - 1.5) * 10}px)`,
  drift: ((i * 7) % 9) - 4,
  variant: i % 3 === 0 ? "big" : "small",
}));
const mists = Array.from({ length: MIST_COUNT }, (_, i) => ({
  id: i,
  top: `calc(50% + ${((i * 5) % 13) - 6}px)`,
  width: 44 + (i % 4) * 16,
  height: i % 2 === 0 ? 14 : 26,
  variant: i % 3 === 0 ? "dense" : "soft",
}));

type ArrowLoaderProps = {
  className?: string;
  label?: string;
};

export function ArrowLoader({ className, label = "Loading" }: ArrowLoaderProps) {
  return (
    <div
      className={[styles.loader, className].filter(Boolean).join(" ")}
      role="status"
      aria-label={label}
    >
      {trails.map((trail) => (
        <Fragment key={`trail-${trail.id}`}>
          {trailLayers.map((layer, layerIndex) => (
            <motion.div
              key={`trail-${trail.id}-${layerIndex}`}
              className={`${styles.trail} ${layer}`}
              style={{ top: `calc(50% + ${((trail.id * 3) % 7) - 3}px)` }}
              animate={{
                x: [52, -148],
                opacity: [0.7, 0],
                scaleX: [1, 0.08],
                scaleY: [1, 0.25],
              }}
              transition={{
                ...forwardTransition,
                delay: trail.id * 0.06 + layerIndex * 0.01,
              }}
            />
          ))}
        </Fragment>
      ))}

      {sonicLines.map((line) => {
        const lineAnim = sonicMotion(line.id);
        return (
          <motion.div
            key={`sonic-${line.id}`}
            className={styles.sonic}
            style={{
              top: line.top,
              width: line.width,
              rotate: line.angle,
            }}
            animate={lineAnim.animate}
            transition={lineAnim.transition}
          />
        );
      })}

      {droplets.map((droplet) => {
        const dropAnim = dropletMotion(droplet.id, droplet.drift);
        return (
          <motion.div
            key={`drop-${droplet.id}`}
            className={droplet.variant === "big" ? styles.dropBig : styles.dropSmall}
            style={{ top: droplet.top }}
            animate={dropAnim.animate}
            transition={dropAnim.transition}
          />
        );
      })}

      {mists.map((mist) => {
        const mistAnim = mistMotion(mist.id);
        return (
          <motion.div
            key={`mist-${mist.id}`}
            className={mist.variant === "dense" ? styles.mistDense : styles.mistSoft}
            style={{
              top: mist.top,
              width: mist.width,
              height: mist.height,
            }}
            animate={mistAnim.animate}
            transition={mistAnim.transition}
          />
        );
      })}

      <motion.img
        src="/arr.png"
        alt=""
        className={styles.arrow}
        animate={arrowCycle}
        transition={arrowTransition}
      />
    </div>
  );
}
