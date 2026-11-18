import { globalStyle, style } from "@vanilla-extract/css";

import { EMBED_APP, EMBED_ATTRIBUTE } from "@repo/core/embed";
import { vars } from "@repo/ui/tokens";

/** 패널 틀 — 칸 사이 14(시안 §6) · 문장 폭 720 상한(`screen-desktop.md` §2). 겉 카드(면 · 모서리)는 놓는 자리가 준다 */
export const scenarioPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  minWidth: 0,
  maxWidth: "720px",
});

/**
 * 불러오는 동안의 자리 — 해설 상자를 뺀 패널 실측(2026-11-13 1440 · BTC 1480 · 005930 1510)에 맞춘다. 늦게 와도 아래 카드
 * (주문 전 체크 · 거래 기록)가 밀리지 않게. 해설 길이만큼은 도착 뒤에 늘어난다(문장 수는 서버가 정한다)
 */
export const scenarioPanelLoading = style({ minHeight: "1500px" });

/** 면책 — 패널 아래 한 번(칸마다 되풀이하지 않는다, `FE-REQ-064` FR-12) */
export const scenarioPanelNote = style({
  margin: 0,
  fontSize: "12px",
  lineHeight: "16px",
  color: vars.colors.text.tertiary,
  wordBreak: "keep-all",
});

/**
 * 앱 웹뷰(`<html data-embed="app">`)에서만 — 손가락 칸 44 이상 · 글자 13 이상(F017 v4 순서 6 · `RN-REQ-032` FR-7).
 * 기간 탭 · 점검 방향 탭 · 펼침 머리처럼 누르는 칸, 그리고 패널 안 라벨 단(12) · 배지(11) 글자. 데스크톱 웹 값은 그대로(`screen-desktop.md` 라벨 12)
 */
const IN_APP = `html[${EMBED_ATTRIBUTE}="${EMBED_APP}"]`;
globalStyle(`${IN_APP} ${scenarioPanel} :is(button, [role="radio"], summary)`, {
  minHeight: "44px",
  display: "inline-flex",
  alignItems: "center",
});
globalStyle(`${IN_APP} ${scenarioPanel} :is(button, [role="radio"])`, { justifyContent: "center", fontSize: "13px" });
globalStyle(`${IN_APP} ${scenarioPanel} summary`, { display: "flex" });
globalStyle(`${IN_APP} ${scenarioPanel}, ${IN_APP} ${scenarioPanelNote}`, { fontSize: "13px" });
