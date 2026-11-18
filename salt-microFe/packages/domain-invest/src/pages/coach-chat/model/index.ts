import { privatePageMetadata } from "@repo/web-shared/config";

/** 코치 대화(F006 C절) — 스켈레톤은 대화 면(소개 · 칩 · 입력) 높이 */
export const COACH_CHAT_PAGE = {
  title: "코치 대화",
  blockName: "코치 대화",
  blockMinHeight: 320,
} as const;

/** 코치 대화 — 내 보유로 답하는 화면이라 검색에 싣지 않는다 */
export const coachChatMetadata = privatePageMetadata("코치 대화");
