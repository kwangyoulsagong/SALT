import { globalStyle, style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { card, detailPanel, formBox, lineCard, panel, SURFACE, toolEmpty } from "../surface.css";

/**
 * 데스크톱 화면 한 장의 틀(`FE-REQ-047` FR-2 · FR-7 · FR-12 · FR-17, `screen-desktop.md` §1).
 * 본문 패널(공용 `AppNavigation`) 안에서 가득 찬 폭 — 가운데 정렬 최대 폭을 두지 않는다. 안쪽 여백은 저축 · 가계부 화면이 먼저 쓴 값(20 · 24 · 32)과 같다.
 * 오른쪽 사이드는 312 고정 + 왼쪽 0.75px 선, 줄어드는 것은 본문. 768~1023 은 사이드가 본문 아래로(선은 위로)
 */
const DESKTOP = "screen and (min-width: 1024px)";

export const SIDE_WIDTH = "312px";

export const frame = style({ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 });

/**
 * 패널 면을 흰색으로 — 흰 표 · 흰 띠가 많은 화면(투자 시세 목록)에서 `#FBFCFD` 패널 위 흰 덩어리가 떠 보였다(2026-11-19 사용자
 * "투자 페이지를 배경 자체를 흰색으로"). 틀이 패널을 가득 채우므로 모서리만 패널과 맞춘다
 */
export const whiteSurface = style({ background: vars.colors.background.white, borderRadius: vars.radius.medium });

/**
 * 카드 판(`FE-REQ-076` FR-1) — 패널 자리를 회색 판(휴대폰 탭 화면 바탕 grey100)으로 칠하고 사이드 왼쪽 선을 지운다.
 * 판 위 묶음은 `surface.css` `card`(흰 · 모서리 20 · 선 0) — 면 색 차이로 가른다(`mobile-design.md` §1). 틀(레일 · 머리 · 사이드 312)은 그대로
 */
export const cardsSurface = style({ background: vars.colors.neutral[100], borderRadius: vars.radius.medium });

export const withSide = style({
  "@media": {
    [DESKTOP]: {
      display: "grid",
      gridTemplateColumns: `minmax(0, 1fr) ${SIDE_WIDTH}`,
      alignItems: "stretch",
      // 사이드 내용이 아무것도 안 그리면(예: 홈 시작하기를 다 끝낸 사람) 칸째 접는다 — 빈 312 칸과 선을 남기지 않는다
      selectors: { "&:has(> aside:empty)": { gridTemplateColumns: "minmax(0, 1fr)" } },
    },
  },
});

export const main = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
  minWidth: 0,
  padding: `${vars.space.lg2} ${vars.space.xl} ${vars.space["2xl"]}`,
});

export const head = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.md,
  flexWrap: "wrap",
  minHeight: "32px",
});

/** 화면 제목 18/700/24 · 1단 — 데스크톱 글자 4단의 맨 위(`deskType.title`) */
export const title = style({
  margin: 0,
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  fontWeight: vars.deskType.title.fontWeight,
  color: vars.colors.desk.text1,
});

export const side = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
  minWidth: 0,
  padding: `${vars.space.lg2} ${vars.space.lg} ${vars.space["2xl"]}`,
  boxShadow: `inset 0 0.75px 0 ${vars.colors.desk.line}`,
  "@media": { [DESKTOP]: { boxShadow: `inset 0.75px 0 0 ${vars.colors.desk.line}` } },
  selectors: { "&:empty": { display: "none" } },
});

/** 카드 판의 사이드 — 선 대신 카드 열(본문 카드와 같은 판 위). 왼쪽 여백은 본문 오른쪽 여백이 이미 준다 */
globalStyle(`${cardsSurface} ${side}`, {
  boxShadow: "none",
  "@media": { [DESKTOP]: { boxShadow: "none", paddingLeft: 0 } },
});

/**
 * 제목 줄이 있으면 사이드 첫 카드를 본문 첫 카드 위 끝에 맞춘다 — 위 여백 + 제목 줄 32 + 사이 16(2026-11-26 사용자 "배치 정렬이 맞아 보이냐" —
 * 사이드가 제목 줄 높이에서 시작해 본문 첫 카드보다 48 위에 떠 있었다). 카드 판 화면 전부(홈 · 저축 · 가계부 · 알림 · 설정)
 */
globalStyle(`${cardsSurface}:has(> ${main} > ${head}) ${side}`, {
  "@media": { [DESKTOP]: { paddingTop: `calc(${vars.space.lg2} + 32px + ${vars.space.lg})` } },
});

/**
 * 카드 판 사이드의 묶음 하나하나 = 흰 카드(모서리 20 · 안쪽 16 — `FE-REQ-076` FR-2). 사이드 내용(행 묶음 · 바로 적기 폼 · 도구)은 도메인 패키지가 채우므로
 * 화면마다 카드를 다시 칠하지 않게 틀이 한 번에 — 빈 묶음은 그리지 않는다
 */
globalStyle(`${cardsSurface} ${side} > *`, {
  padding: vars.space.lg,
  borderRadius: vars.radius.xl,
  background: vars.colors.background.white,
});
globalStyle(`${cardsSurface} ${side} > *:empty`, { display: "none" });

/**
 * 카드 판 위 공용 패널 = 같은 카드(모서리 20 · 선 0 — `FE-REQ-076` FR-2). 설정 · 알림 · 기능 패널은 여러 zone 이 같이 쓰는 `panel` 이라
 * 화면마다 덮지 않고 판이 한 번에 바꾼다(휴대폰 `/m` 이 같은 패널을 흰 섹션으로 바꾸는 것과 같은 방식 — `FE-REQ-074` FR-7)
 */
globalStyle(`${cardsSurface} ${panel}, ${cardsSurface} ${detailPanel}`, { borderRadius: vars.radius.xl, boxShadow: "none" });

/**
 * 카드 판 위 폼 상자 · 선 카드 · 빈 목록 상자 = 흰 카드(모서리 20 · 선 0 · 20 × 24 — `FE-REQ-076` 2단계). 하위 화면(챌린지 · 리볼빙 · 사람 장부 ·
 * 매달 · 예산 · 지출 적기 · 이야기)의 폼과 목록 카드가 각자 선 상자였다 — 기능은 자기가 판 위인지 카드 안인지 모르므로 판이 한 번에 정한다
 */
globalStyle(`${cardsSurface} ${formBox}, ${cardsSurface} ${lineCard}, ${cardsSurface} ${toolEmpty}`, {
  padding: "20px 24px",
  borderRadius: vars.radius.xl,
  background: vars.colors.background.white,
  boxShadow: "none",
});

/**
 * 카드 안(카드 · 공용 패널 · 상세 패널 · 사이드 묶음 · 다른 폼 상자 안)의 폼 상자 · 선 카드 = 선 없는 정보 상자 — 카드 안에 카드를 두지 않는다
 * (`screen-desktop.md` §1-1). 가계부 "이 달 더 보기" 안 이 달 닫기 · 근무 시간 폼 · 명세서 고치기가 여기 걸린다
 */
const IN_CARD = [card, panel, detailPanel, formBox, lineCard].map((c) => `${cardsSurface} ${c}`).concat(`${cardsSurface} ${side} > *`);
globalStyle(
  IN_CARD.flatMap((parent) => [`${parent} ${formBox}`, `${parent} ${lineCard}`]).join(", "),
  { padding: "12px 16px", borderRadius: "12px", background: SURFACE.infoFill, boxShadow: "none" },
);

/**
 * 사이드 직계 자식이 폼 상자 · 선 카드면 사이드 카드 값(안쪽 16 · 사이드 폭 그대로)이 이긴다 — 위 판 규칙과 같은 우선이라 순서로 갈리던 것.
 * 폭 상한(근무 시간 폼 560)은 본문 안 글 폭이라 사이드 카드엔 안 맞다 — 768~1023 에서 사이드가 본문 아래로 내려가면 그 카드만 좁았다(2026-11-21 900 실측)
 */
globalStyle(`${cardsSurface} ${side} > ${formBox}, ${cardsSurface} ${side} > ${lineCard}`, { padding: vars.space.lg, maxWidth: "none" });

/**
 * 판 위 대기 칸 = 흰 카드 모양(`FE-REQ-076` 2단계). `Skeleton` 면(grey100)이 판과 같은 색이라 로딩 중 칸이 통째로 안 보였다(챌린지 · 리볼빙 ·
 * 사람 장부 · 예산 — Playwright `route` 지연 실측). 카드 안 대기 칸은 회색 그대로 — 표지 `data-skeleton` 은 `@repo/ui` `Skeleton` 이 단다
 */
const CARD_PARENTS = [card, panel, detailPanel, formBox, lineCard].join(", ");
globalStyle(`${cardsSurface} [data-skeleton]:not(:is(${CARD_PARENTS}, ${side} > *) [data-skeleton])`, {
  background: vars.colors.background.white,
  borderRadius: vars.radius.xl,
});
