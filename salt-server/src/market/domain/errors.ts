import { DomainError, ErrorKind } from "../../shared/domain";

/** 메시지는 원문 그대로다 — 응답 본문이 달라지면 이관이 아니라 변경이다. */
export class WatchlistDuplicateError extends DomainError {
  constructor() {
    super("MARKET_WATCHLIST_DUPLICATE", ErrorKind.Conflict, "Already in watchlist");
  }
}

/**
 * 거래소가 모르는 종목(Upbit `404 Code not found`) → 404.
 *
 * 전에는 `Failed to fetch price from Upbit` 로 감싸 **500** 이었다 — 사용자가 틀린 심볼을 준 것이
 * 서버 장애로 기록됐다(2026-10-28).
 */
export class UnknownMarketSymbolError extends DomainError {
  constructor(symbol: string) {
    super(
      "MARKET_SYMBOL_NOT_FOUND",
      ErrorKind.NotFound,
      `Unknown market symbol: ${symbol}`
    );
  }
}

/**
 * 추적 자산 상한(`SRV-REQ-008` FR-82). 화면이 카운터 `n / 상한` 을 그릴 수 있게 두 수를 본문에 싣는다 — 문구는 프론트가 정한다
 */
export class TrackedAssetLimitError extends DomainError {
  constructor(trackedCount: number, trackedLimit: number) {
    super("TRACKED_ASSET_LIMIT", ErrorKind.Conflict, "Tracked asset limit reached", { trackedCount, trackedLimit });
  }
}

export class WatchlistItemNotFoundError extends DomainError {
  constructor() {
    super(
      "MARKET_WATCHLIST_ITEM_NOT_FOUND",
      ErrorKind.NotFound,
      "Watchlist item not found"
    );
  }
}

/**
 * 알 수 없는 차트 주기.
 *
 * **조용히 기본값으로 떨어뜨리지 않는다** (`SRV-REQ-008` FR-51). 프론트가 오랫동안
 * `period=miniute`(오타)를 보냈는데 서버가 그것을 `day` 도 `minute` 도 아닌 값으로
 * 받아 **분봉을 돌려줬다** — 오타가 동작해 버리면 아무도 고치지 않는다.
 *
 * `Blocked`(422)인 이유: 문법은 맞고 값이 처리 불가라는 뜻이다. 400 으로 두면
 * 필수 필드 누락과 구분되지 않는다.
 */
/**
 * 알 수 없는 마켓 목록 기간. 차트 주기와 같은 이유로 422 다 — 원래 이 값은 **무엇이
 * 와도 무시됐고**, 그래서 버튼 7개 중 6개가 아무 일도 하지 않는 것이 보이지 않았다.
 */
export class UnsupportedMarketPeriodError extends DomainError {
  constructor(period: string) {
    super(
      "MARKET_OVERVIEW_PERIOD_UNSUPPORTED",
      ErrorKind.Blocked,
      `Unsupported market period: ${period}`
    );
  }
}

export class UnsupportedChartPeriodError extends DomainError {
  constructor(period: string) {
    super(
      "MARKET_CHART_PERIOD_UNSUPPORTED",
      ErrorKind.Blocked,
      `Unsupported chart period: ${period}`
    );
  }
}
