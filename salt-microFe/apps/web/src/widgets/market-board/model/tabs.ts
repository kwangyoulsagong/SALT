/** 시세 보드의 탭. 탭 문구는 변경 금지 목록이다 (`FE-REQ-009` FR-36). */
export const MARKET_BOARD_TABS = [
  { id: "realtime", label: "실시간 차트" },
  { id: "watchList", label: "관심 종목" },
];

export const DEFAULT_MARKET_BOARD_TAB = "realtime";

/** 관심 종목 탭 id. 문자열을 본문 분기에 다시 쓰지 않는다 — 표와 어긋나면 빈 탭이 된다. */
export const WATCH_LIST_TAB = "watchList";
