import { UnsupportedNotificationKindError } from "../errors";
import { isNotificationKind, type NotificationKind } from "../NotificationKind";

/**
 * 생성 관문 (`SRV-REQ-008` FR-21).
 *
 * **만드는 쪽만 막는다.** 옛 종류의 행(`decision_change` 등)은 지우지 않고 남지만 목록 ·
 * 안 읽은 수 · 모두 읽음이 `signal_update` 만 보므로 화면에 나오지 않는다.
 */
export const assertCreatableKind = (kind: string): NotificationKind => {
  if (!isNotificationKind(kind)) throw new UnsupportedNotificationKindError(kind);
  return kind;
};
