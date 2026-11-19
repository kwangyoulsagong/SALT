import { Icons } from "./Styles/Icon.css";

/**
 * 서비스 3D 아이콘 — 사용자가 만든 한 벌(`apps/web/public/assets/Icons`, 2025-01). 옅은 색 판 위 입체 그림.
 * `household`(영수증 + ₩ 동전)는 2026-11-19 홈 카드에 맞춰 같은 화풍으로 더했다(`FE-REQ-048`, 사용자 선택).
 * 파일은 화면 크기의 3배 PNG 를 담은 SVG 다 — 원본 `analysis.svg` 가 내장 이미지째 8.2MB 였다(2026-11-19 → 10KB).
 */
export type ServiceIconVariant = "mission" | "analysis" | "ranking" | "tip" | "social" | "game" | "household";

const SERVICE_ICON_SRC: Record<ServiceIconVariant, string> = {
  mission: "/assets/Icons/mission.svg",
  analysis: "/assets/Icons/analysis.svg",
  ranking: "/assets/Icons/ranking.svg",
  tip: "/assets/Icons/tip.svg",
  social: "/assets/Icons/social.svg",
  game: "/assets/Icons/game.svg",
  household: "/assets/Icons/household.svg",
};

interface IconProps {
  variant?: ServiceIconVariant;
}

/** 장식이다 — 뜻은 옆 제목이 말한다(빈 `alt` · 화면 리더에서 숨김). 전에는 모든 아이콘이 "도메인 이미지"로 읽혔다 */
export const ServiceIcon = ({ variant = "mission" }: IconProps) => (
  <img className={Icons} src={SERVICE_ICON_SRC[variant]} alt="" aria-hidden="true" width={35} height={35} />
);
