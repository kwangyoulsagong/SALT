"use client";

import { PresenceContext, m, useReducedMotion, type Variants } from "framer-motion";
import { useId } from "react";

import { BackdropGlow, GraphicGradient } from "../Motion/graphicDefs";
import { durations, ease, springs } from "../Motion/motionPresets";
import { usePlayAfterMount } from "../Motion/usePlayAfterMount";
import { vars } from "../styles/tokens.css";
import { statusGraphicStyles } from "./styles/statusGraphic.css";

export type StatusGraphicKind = "success" | "progress" | "empty" | "error" | "blocked";
export type StatusGraphicSize = "sm" | "md" | "lg";

export interface StatusGraphicProps {
  kind: StatusGraphicKind;
  size?: StatusGraphicSize;
  className?: string;
}

/**
 * 상태 하나에 그래픽 하나 (FE-REQ-044 FR-10~12).
 *
 * 완료 · 진행 · 빈 상태 · 오류 · 막힘. 문장은 쓰는 쪽이 둔다 — 그래픽은 `aria-hidden` 이고
 * 지워도 문장만으로 뜻이 통해야 한다. 결과 화면은 `EmptyState` 의 `icon` 에 꽂는다.
 *
 * 한 번 재생 후 마지막 프레임에 멈춘다. `progress` 만 반복한다(줄인 모션이면 멈추지 않고 느리게 깜빡인다).
 */
export const StatusGraphic = ({ kind, size = "md", className }: StatusGraphicProps) => {
  const played = usePlayAfterMount();
  const reduced = useReducedMotion();
  const id = useId();
  const Scene = SCENES[kind];

  return (
    <svg
      viewBox="0 0 72 72"
      className={`${statusGraphicStyles({ size })} ${className || ""}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <GraphicGradient id={`${id}-fill`} tone={kind === "error" ? "error" : kind === "empty" ? "neutral" : "primary"} />
        <BackdropGlow id={`${id}-glow`} />
      </defs>
      {/* 바깥 AnimatePresence 의 initial={false} 를 물려받지 않게 끊는다(물려받으면 첫 재생이 막힌다, 2026-09-30 QA) */}
      <PresenceContext.Provider value={null}>
        <m.g key={played ? "play" : "still"} initial={played ? "hidden" : false} animate="shown">
          <Scene fill={`url(#${id}-fill)`} glow={`url(#${id}-glow)`} reduced={Boolean(reduced)} />
        </m.g>
      </PresenceContext.Provider>
    </svg>
  );
};

interface SceneProps {
  fill: string;
  glow: string;
  reduced: boolean;
}

const popIn: Variants = {
  hidden: { scale: 0.4, opacity: 0 },
  shown: { scale: 1, opacity: 1, transition: springs.bouncy },
};

const Success = ({ fill }: SceneProps) => (
  <>
    <m.circle
      cx={36}
      cy={36}
      r={30}
      fill="none"
      strokeWidth={2}
      style={{ stroke: vars.colors.graphic.highlight, originX: "50%", originY: "50%" }}
      variants={{
        hidden: { scale: 0.9, opacity: 0 },
        shown: {
          scale: [0.9, 1.25],
          opacity: [0.8, 0],
          transition: { duration: durations.slow, delay: durations.base, ease: ease.enter },
        },
      }}
    />
    <m.circle cx={36} cy={36} r={28} fill={fill} style={{ originX: "50%", originY: "50%" }} variants={popIn} />
    <m.path
      d="M24 37 L32.5 45 L48.5 28.5"
      fill="none"
      strokeWidth={6}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ stroke: vars.colors.text.white }}
      variants={{
        hidden: { pathLength: 0 },
        shown: { pathLength: 1, transition: { duration: durations.base, delay: 0.18, ease: ease.enter } },
      }}
    />
  </>
);

const Progress = ({ glow, reduced }: SceneProps) => (
  <>
    <circle cx={36} cy={36} r={30} fill={glow} />
    {[24, 36, 48].map((cx, index) => (
      <m.circle
        key={cx}
        cx={cx}
        cy={36}
        r={5}
        style={{ fill: vars.colors.graphic.primary }}
        variants={{
          hidden: { y: 0, opacity: 1 },
          shown: reduced
            ? {
                opacity: [0.35, 1, 0.35],
                transition: { duration: durations.scene * 2, repeat: Infinity, delay: index * 0.3 },
              }
            : {
                y: [0, -7, 0],
                transition: { duration: durations.scene, repeat: Infinity, delay: index * 0.14, ease: ease.move },
              },
        }}
      />
    ))}
  </>
);

const Empty = ({ fill, glow }: SceneProps) => (
  <>
    <circle cx={36} cy={38} r={30} fill={glow} />
    <m.g
      variants={{
        hidden: { y: -10, opacity: 0 },
        shown: { y: 0, opacity: 1, transition: springs.bouncy },
      }}
    >
      {/* 열린 상자 — 뒤판 · 앞판 · 날개 */}
      <path d="M18 30 L36 22 L54 30 L36 38 Z" style={{ fill: vars.colors.neutral[300] }} />
      <path d="M18 30 L36 38 L36 58 L18 50 Z" fill={fill} />
      <path d="M54 30 L36 38 L36 58 L54 50 Z" style={{ fill: vars.colors.neutral[200] }} />
      <path d="M18 30 L11 36 L29 44 L36 38 Z" style={{ fill: vars.colors.neutral[200] }} />
      <path d="M54 30 L61 36 L43 44 L36 38 Z" style={{ fill: vars.colors.neutral[100] }} />
    </m.g>
  </>
);

const ErrorScene = ({ fill }: SceneProps) => (
  <m.g
    style={{ originX: "50%", originY: "50%" }}
    variants={{
      hidden: { x: 0 },
      shown: { x: [0, -5, 5, -3, 3, 0], transition: { duration: durations.slow, delay: durations.base } },
    }}
  >
    <m.circle cx={36} cy={36} r={28} fill={fill} style={{ originX: "50%", originY: "50%" }} variants={popIn} />
    <rect x={32.5} y={20} width={7} height={21} rx={3.5} style={{ fill: vars.colors.text.white }} />
    <circle cx={36} cy={50} r={4} style={{ fill: vars.colors.text.white }} />
  </m.g>
);

const Blocked = ({ fill, glow }: SceneProps) => (
  <>
    <circle cx={36} cy={38} r={30} fill={glow} />
    <m.path
      d="M26 34 V26 a10 10 0 0 1 20 0 V34"
      fill="none"
      strokeWidth={6}
      strokeLinecap="round"
      style={{ stroke: vars.colors.graphic.shade }}
      variants={{
        hidden: { y: -7 },
        shown: { y: 0, transition: { ...springs.bouncy, delay: durations.base } },
      }}
    />
    <rect x={18} y={32} width={36} height={28} rx={8} fill={fill} />
    <circle cx={36} cy={44} r={3.5} style={{ fill: vars.colors.text.white }} />
    <rect x={34.5} y={45} width={3} height={7} rx={1.5} style={{ fill: vars.colors.text.white }} />
  </>
);

const SCENES: Record<StatusGraphicKind, (props: SceneProps) => JSX.Element> = {
  success: Success,
  progress: Progress,
  empty: Empty,
  error: ErrorScene,
  blocked: Blocked,
};
