"use client";

import { m } from "framer-motion";
import { useId } from "react";

import { BackdropGlow, GraphicGradient } from "../Motion/graphicDefs";
import { springs } from "../Motion/motionPresets";
import { vars } from "../styles/tokens.css";
import { progressSceneStyles } from "./styles/progressScene.css";

export type ProgressSceneKind = "trip" | "car" | "umbrella" | "house" | "jar";
export type ProgressSceneSize = "sm" | "md";

export interface ProgressSceneProps {
  kind: ProgressSceneKind;
  /** 지금 칸(0~steps) — 쓰는 쪽이 계산하지 않는다. 서버가 준 값을 그대로 */
  step: number;
  steps: number;
  size?: ProgressSceneSize;
  className?: string;
}

const g = vars.colors.graphic;
const TRACK_LEFT = 24;
const TRACK_RIGHT = 216;
const TRACK_Y = 92;

/** 칸마다 놓이는 그림 — 24×24 상자 안, 가운데 (0,0). 선 아이콘이 아니라 면 채운 글리프(`app-nav-tab-style` 와 같은 결) */
const Glyph = ({ kind, fill }: { kind: ProgressSceneKind; fill: string }) => {
  switch (kind) {
    case "trip":
      return <path d="M-11 1 L11 -7 L13 -5 L1 2 L5 10 L2 11 L-3 4 L-9 6 L-11 4 Z" style={{ fill }} />;
    case "car":
      return (
        <>
          <path d="M-12 4 L-12 -1 L-7 -2 L-4 -8 L5 -8 L9 -2 L12 -1 L12 4 Z" style={{ fill }} />
          <circle cx={-6} cy={5} r={3} style={{ fill: g.shade }} />
          <circle cx={6} cy={5} r={3} style={{ fill: g.shade }} />
        </>
      );
    case "umbrella":
      return (
        <>
          <path d="M-12 0 A12 11 0 0 1 12 0 Z" style={{ fill }} />
          <path d="M-1 0 L1 0 L1 9 A3 3 0 0 1 -5 9 L-3 9 A1 1 0 0 0 -1 9 Z" style={{ fill: g.shade }} />
        </>
      );
    case "house":
      return <path d="M-11 -1 L0 -11 L11 -1 L8 -1 L8 10 L2 10 L2 3 L-2 3 L-2 10 L-8 10 L-8 -1 Z" style={{ fill }} />;
    default:
      return <path d="M-6 -11 L6 -11 L6 -8 L9 -4 L9 10 L-9 10 L-9 -4 L-6 -8 Z" style={{ fill }} />;
  }
};

/**
 * 모이는 장면 — 길 위를 칸마다 한 칸씩 나아간다(`FE-REQ-056` FR-8 · `FE-REQ-044` 배치표 "저축 목표 진척").
 * 칸이 바뀌면 그림이 한 칸 움직이고 멈춘다(무한 반복 없음). 서버 HTML 은 지금 칸 그대로 — `initial={false}`.
 * 줄인 모션은 앱 루트 `MotionConfig reducedMotion="user"` 가 이동을 끈다. 문장을 갖지 않는다 — 진척 글은 쓰는 쪽이 둔다(그래픽은 `aria-hidden`).
 */
export const ProgressScene = ({ kind, step, steps, size = "md", className }: ProgressSceneProps) => {
  const id = useId();
  const total = Math.max(steps, 1);
  const at = Math.min(Math.max(step, 0), total);
  const gap = (TRACK_RIGHT - TRACK_LEFT) / total;
  const x = TRACK_LEFT + gap * at;

  return (
    <svg viewBox="0 0 240 120" className={`${progressSceneStyles({ size })} ${className || ""}`} aria-hidden="true" focusable="false">
      <defs>
        <GraphicGradient id={`${id}-fill`} />
        <BackdropGlow id={`${id}-glow`} />
      </defs>
      <ellipse cx={120} cy={66} rx={116} ry={52} fill={`url(#${id}-glow)`} />
      <rect x={TRACK_LEFT} y={TRACK_Y - 3} width={TRACK_RIGHT - TRACK_LEFT} height={6} rx={3} style={{ fill: g.soft }} />
      {/* 채운 길 — 너비가 아니라 scaleX 로(`motion.md` §5: transform 만) */}
      <m.rect
        x={TRACK_LEFT}
        y={TRACK_Y - 3}
        width={TRACK_RIGHT - TRACK_LEFT}
        height={6}
        rx={3}
        initial={false}
        animate={{ scaleX: at / total }}
        transition={springs.gentle}
        style={{ fill: g.primary, originX: 0, transformBox: "fill-box" }}
      />
      {Array.from({ length: total + 1 }, (_, i) => (
        <circle
          key={i}
          cx={TRACK_LEFT + gap * i}
          cy={TRACK_Y}
          r={i === total ? 5 : 2.5}
          style={{ fill: i <= at ? g.shade : g.highlight }}
        />
      ))}
      {/* 끝 칸의 옅은 그림 — 어디로 가는지 */}
      <g transform={`translate(${TRACK_RIGHT} ${TRACK_Y - 26})`} opacity={0.25}>
        <Glyph kind={kind} fill={g.highlight} />
      </g>
      <m.g initial={false} animate={{ x }} transition={springs.bouncy} style={{ y: TRACK_Y - 26 }}>
        <Glyph kind={kind} fill={`url(#${id}-fill)`} />
      </m.g>
    </svg>
  );
};
