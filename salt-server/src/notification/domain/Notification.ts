import type { NotificationKind } from "./NotificationKind";

/** 화면 문장을 채울 인자. 값은 코드 문자열뿐이다 — 금액 금지(`policy/messageGuard`). */
export type NotificationParams = Record<string, string>;

/** 새로 만드는 알림. 문장 없이 코드와 인자만 담는다 (FR-25). */
export interface NotificationDraft {
  userId: string;
  kind: NotificationKind;
  /** 누가 만들었나. 같은 원인 중복 억제의 키 일부다(예 `ai_coach`). */
  source: string;
  symbol: string | null;
  messageCode: string;
  params: NotificationParams;
  expiresAt: Date | null;
}

/** 목록에 나가는 한 건. 옛 문장 칸(`title` · `message`)은 싣지 않는다. */
export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  symbol: string | null;
  messageCode: string;
  params: NotificationParams;
  isRead: boolean;
  createdAt: Date;
}
