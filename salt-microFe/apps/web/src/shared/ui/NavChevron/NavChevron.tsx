import { ChevronRight } from "lucide-react";

import { navChevron } from "./NavChevron.css";

interface NavChevronProps {
  /** 16 = 본문 옆 링크 · 20 = 패널 머리 */
  size?: 16 | 20;
}

/**
 * **다른 화면으로 가는 자리**의 표시 — 오른쪽 셰브론(2026-09-24 사용자 규칙: "각 패널의 페이지 이동은 셰브론 라이트").
 *
 * 장식이다(`aria-hidden`). 이동한다는 뜻은 감싼 링크의 이름이 말한다. 글자 "›" 로 흉내 내지 않는다 —
 * 화면마다 굵기 · 높이가 달라지고 스크린 리더가 기호를 읽는다.
 */
export const NavChevron = ({ size = 16 }: NavChevronProps) => (
  <ChevronRight className={navChevron} size={size} strokeWidth={2} aria-hidden="true" />
);
