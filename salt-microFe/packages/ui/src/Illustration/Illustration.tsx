"use client";

import { PresenceContext, m } from "framer-motion";
import { useId } from "react";

import { BackdropGlow, GraphicGradient } from "../Motion/graphicDefs";
import { usePlayAfterMount } from "../Motion/usePlayAfterMount";
import { SCENES, type IllustrationScene } from "./scenes";
import { illustrationStyles } from "./styles/illustration.css";

export type { IllustrationScene } from "./scenes";
export type IllustrationSize = "sm" | "md" | "lg";

export interface IllustrationProps {
  scene: IllustrationScene;
  size?: IllustrationSize;
  className?: string;
}

/**
 * 기능의 의미를 보여 주는 한 장면 (FE-REQ-044 FR-20~22).
 *
 * | scene | 장면 | 쓰는 자리 |
 * |---|---|---|
 * | `coinPouch` | 동전이 떨어져 주머니가 출렁인다 | 적립 · 로그인 |
 * | `candles` | 캔들이 왼쪽부터 솟고 표식이 내려앉는다 | 분석 · 시세 · 404 |
 * | `scale` | 저울이 흔들리다 수평을 찾는다 | 목표 비중 |
 * | `coachBubble` | 말풍선이 부풀고 점이 뛴다 | 코치 · 초대 |
 * | `target` | 과녁에 화살이 꽂힌다 | 목표 |
 * | `ledger` | 장부 줄이 차례로 채워진다 | 거래 기록 |
 *
 * 화면에 **보일 때** 한 번 재생하고 마지막 프레임에 멈춘다. 서버 HTML 은 마지막 프레임이다.
 * 문장을 갖지 않는다 — 쓰는 쪽이 둔다.
 */
export const Illustration = ({
  scene,
  size = "md",
  className,
}: IllustrationProps) => {
  const played = usePlayAfterMount();
  const id = useId();
  const Scene = SCENES[scene];

  return (
    <svg
      viewBox="0 0 200 160"
      className={`${illustrationStyles({ size })} ${className || ""}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <GraphicGradient id={`${id}-fill`} />
        <BackdropGlow id={`${id}-glow`} />
      </defs>
      <ellipse cx={100} cy={92} rx={92} ry={66} fill={`url(#${id}-glow)`} />
      {/*
        바깥 AnimatePresence 의 initial={false} 를 물려받지 않게 끊는다 — 물려받으면 첫 재생이 막혀
        끝 장면으로만 뜬다(온보딩 단계 전환 안에서 재생이 없었다, 2026-09-30 QA)
      */}
      <PresenceContext.Provider value={null}>
        <m.g
          key={played ? "play" : "still"}
          initial={played ? "hidden" : false}
          whileInView="shown"
          viewport={{ once: true, amount: 0.4 }}
        >
          <Scene fill={`url(#${id}-fill)`} />
        </m.g>
      </PresenceContext.Provider>
    </svg>
  );
};
