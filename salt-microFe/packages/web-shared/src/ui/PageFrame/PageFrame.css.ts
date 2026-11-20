import { style } from "@vanilla-extract/css";

import { IN_APP_WEBVIEW } from "@repo/core/embed";
import { vars } from "@repo/ui/tokens";

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
  // 앱 웹뷰 — 흰 바탕 한 열 · 좌우 20(행 안쪽 4 와 합쳐 목록 행 24, `screen-mobile.md` §3 · `FE-REQ-060` 모바일 표)
  selectors: { [IN_APP_WEBVIEW]: { padding: "16px 20px 24px", gap: "16px" } },
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
  // 앱 웹뷰 화면 제목 = `t3` 22 Bold(`screen-mobile.md` §3)
  selectors: {
    [IN_APP_WEBVIEW]: {
      fontSize: vars.appType.title.fontSize,
      lineHeight: vars.appType.title.lineHeight,
      fontWeight: vars.appType.title.fontWeight,
      color: vars.colors.text.primary,
    },
  },
});

export const side = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.lg,
  minWidth: 0,
  padding: `${vars.space.lg2} ${vars.space.lg} ${vars.space["2xl"]}`,
  boxShadow: `inset 0 0.75px 0 ${vars.colors.desk.line}`,
  "@media": { [DESKTOP]: { boxShadow: `inset 0.75px 0 0 ${vars.colors.desk.line}` } },
  // 앱 웹뷰는 데스크톱 틀이 아니다(FR-17) — 사이드는 데스크톱 · 태블릿 웹에만. 앱 화면은 본문 한 열 그대로
  selectors: { [IN_APP_WEBVIEW]: { display: "none" }, "&:empty": { display: "none" } },
});
