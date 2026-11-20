import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { TAB_BAR_HEIGHT } from "./MobileShell.css";

/**
 * 하단 고정 버튼 자리 — 고정 버튼이 마지막 내용을 덮지 않게 같은 높이를 본문 끝에 비워 둔다(버튼 48 + 위아래 12 · 12).
 * 홈 표시줄 몫은 탭 틀(`content`)이 이미 비운다
 */
export const spacer = style({ height: "72px", flexShrink: 0 });

/**
 * `/m` 은 하단 탭이 맨 아래다 — 고정 버튼은 탭 바로 위에 뜬다(`screen-mobile.md` §4 "하단 고정 CTA"). 홈 표시줄 여백은 탭이 갖는다.
 * `BottomCTA` 의 고정 값(아래 0 · 안전 영역 여백)을 이긴다(`&&` — 같은 단 클래스라 불러온 차례에 기대지 않는다)
 */
export const aboveTabs = style({
  selectors: {
    "&&": {
      bottom: `calc(${TAB_BAR_HEIGHT} + env(safe-area-inset-bottom, 0px))`,
      paddingBottom: vars.space.md,
    },
  },
});

/** 시트 안 본문 — 시트가 이미 좌우 여백을 준다 */
export const sheetBody = style({ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 });
