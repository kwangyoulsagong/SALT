/**
 * **서버 페이지용 화면 틀 입구** — `PageFrame` · 사이드 행 · 뒤로 · 셰브론만(`FE-REQ-060` 3단계, 2026-11-20).
 *
 * `@repo/web-shared/ui` 배럴을 서버 컴포넌트가 값으로 읽으면 배럴의 `"use client"` 모듈(`DetailTabs`(모션 · 탭) · `SignInRequired` ·
 * `SectionBoundary` · `TimelyTip` …)이 **렌더하지 않아도** 그 페이지 클라이언트 번들에 딸려 간다(`performance-frontend.md` §7).
 * 공개 금융 팁 글이 틀 하나 때문에 118 → 152 kB 였다(2026-11-20 운영 빌드). 같은 컴포넌트를 배럴도 그대로 내보낸다 — 이름이 둘이 아니라 입구가 둘이다.
 * 여기에 클라이언트 상태 · 조회 · 모션을 쓰는 것을 더하지 않는다(그러면 이 입구도 같은 배럴이 된다)
 */
export { PageFrame } from "./PageFrame/PageFrame";
export type { PageFrameProps } from "./PageFrame/PageFrame";
export { SideBlock, SideRow } from "./SideRow/SideRow";
export type { SideRowProps } from "./SideRow/SideRow";
export { BackNav } from "./BackNav/BackNav";
export type { BackNavCrumb, BackNavProps } from "./BackNav/BackNav";
export { NavChevron } from "./NavChevron/NavChevron";
export { ZoneLink } from "./ZoneLink/ZoneLink";
