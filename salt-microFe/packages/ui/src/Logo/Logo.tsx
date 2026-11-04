"use client";

// 클라이언트 잎인 이유: 입체 심볼의 그라데이션 · 필터 id 를 인스턴스마다 다르게(useId) — 머리에 로고가 둘(폭에 따라 하나가
// display:none)이라 같은 id 를 나누면 숨은 쪽 정의를 참조해 칠이 빠진다. 상태는 없다.
import { useId } from "react";

import { BRAND_MARK as M } from "@repo/tokens";

import { mark, root, wordmark } from "./Logo.css";

/**
 * SALT 로고 (`FE-REQ-051` FR-1) — 소금 물방울 심볼 + "Salt" 글자.
 *
 * 모양은 `@repo/tokens` `BRAND_MARK` 한 벌, 색은 `tokens.colors.brand.mark`(은회색) — 이 파일에 hex 를 두지 않는다.
 * 움직임은 넣지 않는다(`motion.md` — 반복 모션은 진행 중에만).
 *
 * 두 벌(입체 + 단색):
 * - 기본은 **입체**(접힌 면 + 번지는 빛 · 그늘) — 머리 로고(20~24)부터 큰 자리까지
 * - `depth={false}` — **단색**(진한 은회색 · 어두운 바탕은 흰색). 한 색 자리(파비콘은 로고와 같은 입체 — 사용자 2026-11-04)
 * - `ripples` — 심볼 아래 물결. 큰 자리에만(작으면 선 하나로 뭉개진다)
 *
 * `size` 는 **높이**다: `xs 16` · `sm 20` · `md 24` · `lg 32`. 혼자 쓰면 `role="img"` + `aria-label`,
 * 이름이 붙은 링크 · 버튼 안이면 `decorative` 로 화면 리더에서 뺀다(링크가 "SALT 홈").
 */
export type LogoVariant = "full" | "symbol";
export type LogoSize = "xs" | "sm" | "md" | "lg";
export type LogoTheme = "light" | "dark";

export interface LogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  theme?: LogoTheme;
  /** 입체(기본) — `false` 면 단색 */
  depth?: boolean;
  /** 물결(심볼만) */
  ripples?: boolean;
  /** 화면 리더 이름 — 기본 "SALT"(브랜드 이름이라 문구 파일에 두지 않는다) */
  label?: string;
  decorative?: boolean;
  className?: string;
}

export const LOGO_HEIGHT: Record<LogoSize, number> = { xs: 16, sm: 20, md: 24, lg: 32 };

/** 입체 물방울 — 200 칸 좌표 그대로 그린다(부르는 쪽이 viewBox 로 자른다) */
const DepthDrop = ({ id }: { id: string }) => {
  const [l0, l1] = M.faceLeftX;
  const [r0, r1] = M.faceRightX;
  return (
    <>
      <defs>
        <linearGradient id={`${id}-l`} x1={l0} x2={l1} y1={0} y2={0} gradientUnits="userSpaceOnUse">
          <stop offset="0" className={mark.stopMid} />
          <stop offset="1" className={mark.stopLight} />
        </linearGradient>
        <linearGradient id={`${id}-r`} x1={r0} x2={r1} y1={0} y2={0} gradientUnits="userSpaceOnUse">
          <stop offset="0" className={mark.stopShadow} />
          <stop offset="1" className={mark.stopMid} />
        </linearGradient>
        <filter id={`${id}-b`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={M.glow.blur} />
        </filter>
        <filter id={`${id}-s`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={M.foldLine.blur} />
        </filter>
        <clipPath id={`${id}-c`}>
          <path d={M.drop} />
        </clipPath>
        <clipPath id={`${id}-cl`}>
          <path d={M.foldLeft} />
        </clipPath>
        <clipPath id={`${id}-cr`}>
          <path d={M.foldRight} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-c)`}>
        <path d={M.foldLeft} fill={`url(#${id}-l)`} />
        <path d={M.foldRight} fill={`url(#${id}-r)`} />
        <g clipPath={`url(#${id}-cl)`}>
          <ellipse className={mark.fillHi} {...pick(M.glow)} opacity={M.glow.opacity} filter={`url(#${id}-b)`} />
        </g>
        <g clipPath={`url(#${id}-cr)`}>
          <ellipse className={mark.fillShadow} {...pick(M.shade)} opacity={M.shade.opacity} filter={`url(#${id}-b)`} />
        </g>
        <path d={M.fold} className={mark.strokeHi} fill="none" strokeWidth={M.foldLine.width} opacity={M.foldLine.opacity} filter={`url(#${id}-s)`} />
      </g>
    </>
  );
};

const pick = ({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) => ({ cx, cy, rx, ry });

const Ripples = ({ id, flatClass }: { id: string; flatClass?: string }) => (
  <>
    {flatClass ? null : (
      <defs>
        <linearGradient id={`${id}-w`} x1={0} x2={0} y1={M.ripples.cy - 12} y2={M.ripples.cy + 12} gradientUnits="userSpaceOnUse">
          <stop offset="0" className={mark.stopLight} />
          <stop offset="1" className={mark.stopDeep} />
        </linearGradient>
        <filter id={`${id}-g`} x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation={M.ripples.contact.blur} />
        </filter>
      </defs>
    )}
    {M.ripples.rings.map((ring) => (
      <ellipse
        key={ring.rx}
        className={flatClass ? `${flatClass} ${mark.noFill}` : mark.noFill}
        cx={100}
        cy={M.ripples.cy}
        rx={ring.rx}
        ry={ring.ry}
        stroke={flatClass ? undefined : `url(#${id}-w)`}
        strokeWidth={ring.width}
        opacity={ring.opacity}
      />
    ))}
    {flatClass ? null : (
      <ellipse
        className={mark.fillDeep}
        cx={100}
        cy={M.ripples.cy - 1}
        rx={M.ripples.contact.rx}
        ry={M.ripples.contact.ry}
        opacity={M.ripples.contact.opacity}
        filter={`url(#${id}-g)`}
      />
    )}
  </>
);

export const Logo = ({
  variant = "full",
  size = "sm",
  theme = "light",
  depth = true,
  ripples = false,
  label = "SALT",
  decorative = false,
  className,
}: LogoProps) => {
  // useId 는 ":r0:" 꼴 — url(#…) 참조에서 콜론을 피한다
  const id = `salt-logo${useId().replace(/:/g, "")}`;
  const height = LOGO_HEIGHT[size];
  const a11y = decorative
    ? ({ "aria-hidden": true, focusable: false } as const)
    : ({ role: "img", "aria-label": label } as const);
  const flatClass = theme === "dark" ? mark.flatDark : mark.flatLight;
  const rootClass = className ? `${root} ${className}` : root;

  if (variant === "symbol") {
    const viewBox = ripples ? M.symbolViewBox.withRipples : M.symbolViewBox.dropOnly;
    return (
      <svg className={rootClass} width={height} height={height} viewBox={viewBox} data-logo="symbol" {...a11y}>
        {ripples ? <Ripples id={id} flatClass={depth ? undefined : flatClass} /> : null}
        {depth ? <DepthDrop id={id} /> : <path className={flatClass} d={M.drop} />}
      </svg>
    );
  }

  // 글자 로고 — 물방울이 글자 높이에 앉는다. 물결은 이 크기에서 뭉개져 쓰지 않는다
  const { lockup } = M;
  return (
    <svg
      className={rootClass}
      width={(height * lockup.fullWidth) / lockup.height}
      height={height}
      viewBox={`0 0 ${lockup.fullWidth} ${lockup.height}`}
      data-logo="full"
      {...a11y}
    >
      <svg x={lockup.drop.x} y={lockup.drop.y} width={lockup.drop.width} height={lockup.drop.height} viewBox={lockup.drop.viewBox}>
        {depth ? <DepthDrop id={id} /> : <path className={flatClass} d={M.drop} />}
      </svg>
      <g className={wordmark[theme]} transform={`translate(${lockup.wordmarkX} 0)`}>
        {M.wordmark.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
};

export default Logo;
