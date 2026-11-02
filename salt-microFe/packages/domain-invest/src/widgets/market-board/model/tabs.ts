/** 시세 보드의 탭. 탭 문구는 변경 금지 목록이다 (`FE-REQ-009` FR-36). */
export const MARKET_BOARD_TABS = [
  { id: "realtime", label: "실시간 차트" },
  { id: "watchList", label: "관심 종목" },
];

export const DEFAULT_MARKET_BOARD_TAB = "realtime";

/** 관심 종목 탭 id. 문자열을 본문 분기에 다시 쓰지 않는다 — 표와 어긋나면 빈 탭이 된다. */
export const WATCH_LIST_TAB = "watchList";

/**
 * 자산군 탭(F011 `FE-REQ-041`) — "투자 분석" 제목 바로 아래. 탭마다 **같은 화면**(실시간 차트 · 관심 종목 · 같은 표 · 같은 미리보기)
 * 이고 데이터만 다르다. 국내 주식은 소유자에게만 있다(KRX 재배포 약관, 서버 판정) — 없는 사용자에겐 이 줄 자체가 없다.
 * id 는 `MarketAssetClass` 값과 같다(문자열 — 이 barrel 이 엔티티를 값으로 끌어오지 않게, `model/index.ts` 주석)
 */
export const ASSET_CLASS_TABS = [
  { id: "crypto", label: "코인" },
  { id: "kr_stock", label: "국내 주식" },
];

export const DEFAULT_ASSET_CLASS_TAB = "crypto";
