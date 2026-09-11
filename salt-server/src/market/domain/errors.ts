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
