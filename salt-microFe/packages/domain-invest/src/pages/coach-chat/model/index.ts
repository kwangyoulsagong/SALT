import { panel, split } from "@repo/ui/layoutTree";

import { privatePageMetadata } from "@repo/web-shared/config";

/** 코치 대화(F006 C절) — 스켈레톤은 대화 면(소개 · 칩 · 입력) 높이 */
export const COACH_CHAT_PAGE = {
  title: "코치 대화",
  blockName: "코치 대화",
  blockMinHeight: 320,
} as const;

/** 코치 대화 — 내 보유로 답하는 화면이라 검색에 싣지 않는다 */
export const coachChatMetadata = privatePageMetadata("코치 대화");

/** PC 격자 칸(F006 A절 · `FE-REQ-030` FR-51) — id 는 저장 배치의 열쇠라 바꾸면 옛 저장이 기본 배치로 돌아간다(`parseLayout`) */
export const COACH_GRID_PANELS = {
  chat: { id: "chat", title: "코치 대화" },
  card: { id: "card", title: "오늘의 추천" },
  position: { id: "position", title: "포지션 요약" },
} as const;

/** 기본 배치: 좌 대화 6 · 우상 추천 · 우하 포지션(FR-51). 가지 id 를 고정해 둔다 — 새 가지는 `freshSplitId` 가 이것과 겹치지 않게 만든다 */
export const COACH_GRID_DEFAULT_LAYOUT = split(
  "row",
  panel(COACH_GRID_PANELS.chat.id),
  split("column", panel(COACH_GRID_PANELS.card.id), panel(COACH_GRID_PANELS.position.id), 0.55, "coach-right"),
  0.6,
  "coach-root"
);

export const COACH_GRID_MESSAGES = {
  /** 오늘의 추천 칸 — 브리핑을 읽는 중 · 못 읽음 */
  cardLoading: "오늘의 추천을 불러오는 중이에요",
  cardFailed: "오늘의 추천을 불러오지 못했어요.",
  /** 리포트로 — 다른 페이지로 가는 줄 */
  reportLink: "코치 리포트에서 보기",
} as const;
