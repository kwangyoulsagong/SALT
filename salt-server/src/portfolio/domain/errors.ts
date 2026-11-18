import { DomainError, ErrorKind } from "../../shared/domain";

/** 메시지는 원문 그대로다 — 응답 본문이 달라지면 이관이 아니라 변경이다. */
export class InsufficientQuantityError extends DomainError {
  constructor() {
    super(
      "PORTFOLIO_INSUFFICIENT_QUANTITY",
      ErrorKind.Invalid,
      "Insufficient quantity to sell"
    );
  }
}

/** 없는 거래 · **남의 거래** 둘 다 이것(404) — 남의 거래 id 로 존재를 떠볼 수 없게(`DB-REQ-022` FR-74. 옛 403 은 2026-11-18 걷음) */
export class TransactionNotFoundError extends DomainError {
  constructor() {
    super(
      "PORTFOLIO_TRANSACTION_NOT_FOUND",
      ErrorKind.NotFound,
      "Transaction not found"
    );
  }
}
