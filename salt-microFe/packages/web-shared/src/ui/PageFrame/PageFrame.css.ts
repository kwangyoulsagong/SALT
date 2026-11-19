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

export const withSide = style({
  "@media": { [DESKTOP]: { display: "grid", gridTemplateColumns: `minmax(0, 1fr) ${SIDE_WIDTH}`, alignItems: "stretch" } },
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
  // 앱 웹뷰는 데스크톱 틀이 아니다(FR-17) — 사이드는 데스크톱 · 태블릿 웹에만. 앱 화면은 본문 한 열 그대로
  selectors: { [IN_APP_WEBVIEW]: { display: "none" } },
});
