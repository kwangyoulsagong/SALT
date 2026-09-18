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

export class TransactionNotFoundError extends DomainError {
  constructor() {
    super(
      "PORTFOLIO_TRANSACTION_NOT_FOUND",
      ErrorKind.NotFound,
      "Transaction not found"
    );
  }
}

/**
 * 남의 거래에 손대려 한 경우 — 원문의 403 · "Access denied" 를 유지한다.
 *
 * `ErrorKind.Forbidden` 을 커널에 넣은 이유는 그 enum 주석에 적었다. 요약하면
 * **응답 코드를 바꾸지 않으면서 `domain` 이 `presentation` 을 모르게** 하는 길이
 * 그것뿐이었다.
 */
export class TransactionAccessDeniedError extends DomainError {
  constructor() {
    super(
      "PORTFOLIO_TRANSACTION_ACCESS_DENIED",
      ErrorKind.Forbidden,
      "Access denied"
    );
  }
}
