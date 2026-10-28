import { DomainError, ErrorKind } from "../../shared/domain";

/** 1종 밖의 종류로 만들려 했다 → 422 (`SRV-REQ-009` FR-12). */
export class UnsupportedNotificationKindError extends DomainError {
  constructor(kind: string) {
    super(
      "NOTIFICATION_KIND_UNSUPPORTED",
      ErrorKind.Blocked,
      `Notification kind is not allowed: ${kind}`
    );
  }
}

/** 알림 인자에 금액이 섞였다 → 422 (FR-24). 잠금 화면에 자산 금액이 뜨면 안 된다. */
export class NotificationAmountError extends DomainError {
  constructor(key: string) {
    super(
      "NOTIFICATION_AMOUNT_NOT_ALLOWED",
      ErrorKind.Blocked,
      `Notification params must not carry amounts: ${key}`
    );
  }
}

/** `messageCode` 가 비었거나 문장처럼 생겼다 → 422 (FR-25). */
export class NotificationMessageCodeError extends DomainError {
  constructor(code: string) {
    super(
      "NOTIFICATION_MESSAGE_CODE_INVALID",
      ErrorKind.Blocked,
      `Notification messageCode must be a dotted code: ${code}`
    );
  }
}
