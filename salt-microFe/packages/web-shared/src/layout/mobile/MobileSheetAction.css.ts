import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { TAB_BAR_SPACE } from "./MobileShell.css";

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
      bottom: TAB_BAR_SPACE,
      paddingBottom: vars.space.md,
    },
  },
});

/**
 * 떠 있는 시트(기준 화면 분석 §9 — `requirements/reports/research/2026-11-20-mobile-reference-screens.md`) — 좌우 · 아래 10 떨어져 모서리 32.
 * `BottomSheet` 의 꽉 찬 폭 · 위 모서리만 둥근 값을 휴대폰에서만 이긴다(`&&`)
 */
export const floatingSheet = style({
  selectors: {
    "&&": {
      width: "calc(100% - 20px)",
      margin: "0 10px calc(10px + env(safe-area-inset-bottom, 0px))",
      paddingBottom: vars.space.md,
      borderRadius: "32px",
    },
  },
});

/** 시트 안 본문 — 시트가 이미 좌우 여백을 준다 */
export const sheetBody = style({ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 });

/** 오프라인 이유 한 줄(`FE-REQ-073` FR-3) — 막힌 버튼 바로 위 · `t7`. 오류가 아니라 사실이라 빨강 0 */
export const offlineReason = style({
  margin: "0 0 8px",
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  color: vars.colors.neutral[700],
  textAlign: "center",
  wordBreak: "keep-all",
});

/** 시트 안 입력을 통째로 막는 묶음 — `fieldset disabled` 가 안의 입력 · 제출을 브라우저 기본으로 막는다. 테두리 · 여백 0 */
export const offlineFieldset = style({ border: 0, margin: 0, padding: 0, minWidth: 0, display: "contents" });
