import { globalStyle, style } from "@vanilla-extract/css";

import { EMBED_APP, EMBED_ATTRIBUTE } from "@repo/core/embed";
import { vars } from "@repo/ui/tokens";

/**
 * 패널 틀 — 칸 사이 14(시안 §6). 겉 카드(면 · 모서리)는 놓는 자리가 준다.
 * 상세 개요 탭의 넓은 칸(`FE-REQ-049` — 오른쪽 좁은 열에서 차트 아래로 옮겨 왔다)에서는 줄 여섯을 두 단으로 흘린다(`rows`) —
 * 한 줄 글 폭은 단 폭(≤ 720)이 지킨다(`screen-desktop.md` §2). 폭 판정은 화면이 아니라 패널 폭(컨테이너 쿼리)이라 놓는 자리가 몰라도 된다
 */
export const scenarioPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  minWidth: 0,
  containerType: "inline-size",
});

/** 두 단이 되는 패널 폭 — 단 하나가 약 420 이상일 때 */
const TWO_COLUMNS = "(min-width: 880px)";

/** 줄 여섯(점검 · 원인 · 회사 · 판단 · 틀리는 때 · 성적) — 넓으면 두 단(높이 균형은 브라우저가), 줄은 단을 넘어 쪼개지지 않는다 */
export const rows = style({
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  minWidth: 0,
  "@container": {
    [TWO_COLUMNS]: { display: "block", columnCount: 2, columnGap: "32px" },
  },
});
globalStyle(`${rows} > *`, { breakInside: "avoid" });
globalStyle(`${rows} > * + *`, { "@container": { [TWO_COLUMNS]: { marginTop: "14px" } } });

/** 내 기준 · 면책 — 두 단 아래 한 줄로, 글 폭 720 상한 */
export const narrow = style({ maxWidth: "720px", minWidth: 0 });

/**
 * 큰 숫자 · 막대 | 부채꼴 — 넓으면 한 줄 두 칸(부채꼴은 그림 판 360 이 원래 크기). 좁으면 위아래.
 * 전에는 넓은 칸에서 부채꼴이 왼쪽 360 에 붙고 오른쪽이 1,500px 비었다(사용자 2026-11-19 "정렬")
 */
export const lead = style({
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  minWidth: 0,
  "@container": {
    [TWO_COLUMNS]: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) 360px",
      columnGap: "32px",
      alignItems: "center",
    },
  },
});

export const leadMain = style({ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 });

/** AI 해설 상자 — 두 단 전체 폭(단 경계와 같은 양 끝), 문장 한 줄은 720 상한 */
export const explainWide = style({ minWidth: 0 });
globalStyle(`${explainWide} li`, { maxWidth: "720px" });

/** 기간 탭 — 넓은 칸에서 1,800px 로 늘리지 않는다(내용 폭 · 최소 320) */
globalStyle(`${scenarioPanel} > [role="radiogroup"]`, {
  "@container": { [TWO_COLUMNS]: { alignSelf: "flex-start", minWidth: "320px" } },
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
 * 앱 웹뷰(`<html data-embed="app">`)에서만 — 손가락 칸 44 이상 · 글자 13 이상(F017 v4 순서 6 · `ADR-012` 로 PWA `/m` 에 옮김).
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
