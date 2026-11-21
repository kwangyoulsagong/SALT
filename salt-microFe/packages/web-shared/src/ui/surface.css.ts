import { globalStyle, style } from "@vanilla-extract/css";

import { MOBILE_ROOT } from "@repo/core/mobile";

import { enterReveal } from "@repo/ui/enterReveal";
import { vars } from "@repo/ui/tokens";

/**
 * 화면 표면 — 회색 바탕 위 흰 패널 (2026-09-23 참고 화면 실측).
 *
 * 실측(1440px · 12개 기능 페이지):
 * - 바탕은 옅은 회색, 패널은 흰 면 · 모서리 16px · **바깥 그림자 없이 1px 안쪽 헤어라인**
 * - 패널 제목 18/24 bold, 본문은 13~14px semibold 중심, 보조 글은 12px 회색
 * - 보조 버튼 높이 28 · 13px semibold · 모서리 7 · 옅은 회색 면
 * - 종목 로고는 원형 28~40px — 이름이 나오는 자리에는 늘 있다
 *
 * 상세 분석 · 코치 리포트가 같이 쓴다. 한 화면만 다른 카드 모양이면 다른 제품처럼 보인다.
 */
export const SURFACE = {
  panelRadius: "16px",
  hairline: `inset 0 0 0 1px ${vars.colors.desk.line}`,
  weakFill: "rgba(7, 25, 76, 0.04)",
  /** 정보 상자 면(`screen-desktop.md` §3 실측 — 모서리 12 · 그림자 없음). 패널 위 회색 상자 대신(`FE-REQ-060` FR-1) */
  infoFill: "rgba(13, 25, 74, 0.02)",
} as const;

const NARROW = "screen and (max-width: 640px)";

export const panel = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "20px 24px 24px",
  borderRadius: SURFACE.panelRadius,
  background: vars.colors.background.white,
  boxShadow: SURFACE.hairline,
  minWidth: 0,
  // 들어올 때 8px 아래에서 올라오며, 형제 패널끼리 차례로 — 늦게 스트리밍된 패널도 같다 (FE-REQ-044 P-39)
  ...enterReveal,
  "@media": { [NARROW]: { padding: "16px 16px 20px" }, ...enterReveal["@media"] },
});

export const panelHead = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.sm,
  minHeight: "28px",
});

export const panelTitle = style({
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  color: vars.colors.text.primary,
  fontSize: "18px",
  lineHeight: "24px",
  fontWeight: vars.fontWeights.bold,
});

/** 제목 아래 한 줄 설명 — `text.tertiary`(2026-11-18 neutral 500 → 이 토큰. 흰 3.03 → 5.63:1, `FE-REQ-047` FR-13 · 사용자 결정) */
export const panelDescription = style({
  margin: "-8px 0 0",
  color: vars.colors.text.tertiary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

/* ── 카드 판(`FE-REQ-076` — 데스크톱도 휴대폰 같은 느낌) ─────────────── */

/**
 * 데스크톱 카드 — `PageFrame surface="cards"`(회색 판) 위 흰 면 · 모서리 20 · 안쪽 20 × 24 · 선 · 그림자 0.
 * 휴대폰 탭 카드(`mobile-design.md` §1 — 모서리 20 · 안쪽 20)와 같은 모양에 데스크톱 폭만 더 넓게. 카드 안에 카드를 두지 않는다
 */
export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  padding: "20px 24px",
  borderRadius: vars.radius.xl,
  background: vars.colors.background.white,
  minWidth: 0,
  ...enterReveal,
});

/** 아이콘 판 — 44 · 모서리 12 · grey100 + 3D 아이콘 28(휴대폰 `MobileSummary` `iconTile` 과 같은 값, `FE-REQ-076` FR-3) */
export const iconTile = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "44px",
  height: "44px",
  borderRadius: vars.radius.medium,
  background: vars.colors.neutral[100],
});
globalStyle(`${iconTile} img`, { width: "28px", height: "28px" });

/** 작은 아이콘 판 — 사이드 행 36 · 아이콘 24 */
export const iconTileSm = style([iconTile, { width: "36px", height: "36px", borderRadius: "10px" }]);
globalStyle(`${iconTileSm} img`, { width: "24px", height: "24px" });

/** 회색 알약 — 그 도메인의 다음 행동 한 단어(휴대폰 홈 카드와 같은 문구). 카드 전체가 링크면 모양만. 높이 32 · 13/600 */
export const pill = style({
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  height: "32px",
  padding: "0 12px",
  borderRadius: vars.radius.medium,
  background: vars.colors.neutral[100],
  color: vars.colors.neutral[700],
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  whiteSpace: "nowrap",
});

/**
 * 폼 상자 — 옅은 면 · 안쪽 선 · 모서리 12 · 12 × 16. 기능 폼 · 묻는 카드(챌린지 · 리볼빙 · 사람 장부 · 봉투 · 근무 시간 · 이 달 닫기 …)가
 * 같은 값을 화면마다 복사해 쓰던 것을 한 벌로(`FE-REQ-076` 2단계). 카드 판(`PageFrame surface="cards"`) 위에선 판이 흰 카드로,
 * 카드 안에선 선 없는 정보 상자로 바꾼다(`PageFrame.css`) — 기능은 자기가 어디 놓이는지 모른다. 휴대폰 · 다른 면에선 이 값 그대로
 */
export const formBox = style({
  display: "flex",
  flexDirection: "column",
  padding: "12px 16px",
  borderRadius: "12px",
  background: SURFACE.infoFill,
  boxShadow: `inset 0 0 0 1px ${vars.colors.desk.line}`,
});

/** 선 카드 — 흰 면 · 안쪽 선 · 모서리 12 · 20. 카드 판 위에선 `card` 모양, 카드 안에선 정보 상자(`formBox` 와 같은 규칙) */
export const lineCard = style({
  display: "flex",
  flexDirection: "column",
  padding: "20px",
  borderRadius: "12px",
  background: vars.colors.background.white,
  boxShadow: `inset 0 0 0 1px ${vars.colors.desk.line}`,
  minWidth: 0,
});

/** 옅은 회색 면 상자 — 안내 · 요약 · 지표 칸 */
export const weakBox = style({
  borderRadius: "12px",
  background: SURFACE.weakFill,
});

/** 화면 머리의 되돌아가기 */
export const backLink = style({
  alignSelf: "flex-start",
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
  color: vars.colors.text.tertiary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "none",
  ":hover": { color: vars.colors.neutral[800] },
});

/* ── 종목 상세 패널(`FE-REQ-049` FR-3, `screen-desktop.md` §1 "상세 패널") ─────────────── */

/**
 * 상세 패널 — 흰 면 · 모서리 16 · 안쪽 1px 선. 머리 줄이 위 여백을 대신한다(머리 44 + 본문 · 아래 20).
 * 코인 · 국내 상세 · 호가 · 투자자 · 소식 · 내 거래가 같은 패널이다 — 두 상세가 다른 화면처럼 보이지 않게(B5)
 */
export const detailPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "0 20px 20px",
  borderRadius: SURFACE.panelRadius,
  background: vars.colors.background.white,
  boxShadow: SURFACE.hairline,
  minWidth: 0,
  ...enterReveal,
  "@media": { [NARROW]: { padding: "0 16px 16px" }, ...enterReveal["@media"] },
});

/** 패널 머리 — 높이 44 · 제목 왼쪽 · 메타 오른쪽 */
export const detailPanelHead = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.sm,
  minHeight: "44px",
  margin: 0,
});

/** 패널 제목 13/600 1단 */
export const detailPanelTitle = style({
  margin: 0,
  color: vars.colors.desk.text1,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
});

/** 패널 메타(기준 시각 · 출처) 12/500 2단(3단은 글자에 쓰지 않는다 — `screen-desktop.md` §2) */
export const detailPanelMeta = style({
  margin: 0,
  color: vars.colors.desk.text2,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  fontVariantNumeric: "tabular-nums",
});

/** 머리 줄 없이 내용이 맨 위에서 시작하는 상세 패널(한 장 패널 — 자기 머리를 갖는다) — 위 여백 16 */
export const detailPanelTop = style({ paddingTop: "16px" });

/**
 * 도구 화면 2단(2026-11-20) — 목록 · 빈 상태(넓게) | 입력 카드 400. 1280 이상 나란히(입력 카드는 붙어서 따라온다),
 * 그보다 좁으면 입력이 위. 폼만 왼쪽에 두고 오른쪽 60% 를 비우던 화면(챌린지 · 리볼빙 · 목표 만들기 …)을 같은 틀로
 */
export const toolGrid = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: "20px",
  alignItems: "start",
  "@media": { "screen and (min-width: 1280px)": { gridTemplateColumns: "minmax(0, 1fr) 400px" } },
});

export const toolMain = style({ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 });

/** 입력 칸 — DOM 은 목록보다 앞(좁을 땐 위), 넓을 땐 오른쪽 열로(order). 카드 모양은 안에 든 폼이 갖는다 — 없으면 `toolCard` */
export const toolAside = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minWidth: 0,
  "@media": { "screen and (min-width: 1280px)": { order: 1, position: "sticky", top: "16px" } },
});

export const toolCard = style([lineCard, { gap: "12px" }]);

/** 목록이 비었을 때 — 패널 높이를 지키는 정보 상자(무엇이 여기 생기는지 · 어떻게 채우는지) */
export const toolEmpty = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  padding: "24px",
  borderRadius: "12px",
  background: SURFACE.infoFill,
  boxShadow: `inset 0 0 0 1px ${vars.colors.desk.line}`,
});

export const toolEmptyTitle = style({
  margin: 0,
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.deskType.section.fontWeight,
  color: vars.colors.desk.text1,
});

export const toolEmptyBody = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

/** 휴대폰(`/m`) — 글자 13 · 누름 44(`FE-REQ-072` FR-5 실측). 데스크톱 값은 그대로 */
globalStyle(`${MOBILE_ROOT} ${backLink}`, { minHeight: "44px", display: "inline-flex", alignItems: "center" });

/**
 * 휴대폰(`/m`) 상세 화면의 패널 = 흰 섹션(`FE-REQ-074` FR-7 · `mobile-design.md` §1) — 모서리 0 · 안쪽 선 0 · 좌우 20 · 위아래 24 ·
 * 제목 `t3` 22 Bold. 섹션 사이 회색 띠는 부르는 쪽 묶음의 간격 16. 데스크톱 값은 그대로
 */
globalStyle(`${MOBILE_ROOT} ${panel}`, { borderRadius: 0, boxShadow: "none", padding: "24px 20px" });
globalStyle(`${MOBILE_ROOT} ${panelTitle}`, {
  fontSize: vars.appType.title.fontSize,
  lineHeight: vars.appType.title.lineHeight,
  fontWeight: vars.appType.title.fontWeight,
});
globalStyle(`${MOBILE_ROOT} ${panelDescription}`, { margin: "-4px 0 0", wordBreak: "keep-all" });
