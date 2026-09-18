import { DomainError, ErrorKind } from "../../shared/domain";

/** 메시지는 원문 그대로다 — 응답 본문이 달라지면 이관이 아니라 변경이다. */
export class WatchlistDuplicateError extends DomainError {
  constructor() {
    super("MARKET_WATCHLIST_DUPLICATE", ErrorKind.Conflict, "Already in watchlist");
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
 * **조용히 기본값으로 떨어뜨리지 않는다** (`FE-REQ-010` FR-51). 프론트가 오랫동안
 * `period=miniute`(오타)를 보냈는데 서버가 그것을 `day` 도 `minute` 도 아닌 값으로
 * 받아 **분봉을 돌려줬다** — 오타가 동작해 버리면 아무도 고치지 않는다.
 *
 * `Blocked`(422)인 이유: 문법은 맞고 값이 처리 불가라는 뜻이다. 400 으로 두면
 * 필수 필드 누락과 구분되지 않는다.
 */
export class UnsupportedChartPeriodError extends DomainError {
  constructor(period: string) {
    super(
      "MARKET_CHART_PERIOD_UNSUPPORTED",
      ErrorKind.Blocked,
      `Unsupported chart period: ${period}`
    );
  }
}
