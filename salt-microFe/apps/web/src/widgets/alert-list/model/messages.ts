/** 알림 목록 문구(`FE-REQ-030` FR-110 · 112 · 빈 상태) */
export const ALERT_LIST_MESSAGES = {
  /** 스펙 문구 "새 알림이 없습니다"를 해요체로(모든 문구 해요체 — `screen-mobile.md` §5, 2026-11-18) */
  empty: "새 알림이 없어요",
  emptyDescription: "설정에서 켠 도메인의 알림만 와요",
  loadFailed: "알림을 불러올 수 없어요",
  signedOut: "로그인하면 알림을 볼 수 있어요",
  more: "더 보기",
  moreFailed: "다음 알림을 불러오지 못했어요. 다시 눌러 주세요",
  listLabel: "알림 목록",
} as const;
