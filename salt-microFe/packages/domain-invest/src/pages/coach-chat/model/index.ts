import { privatePageMetadata } from "@repo/web-shared/config";

/** 코치 대화(F006 C절) — 스켈레톤은 대화 면 높이(입력이 칸 아래에 붙는 한 줄 대화, 2026-11-19) */
export const COACH_CHAT_PAGE = {
  title: "코치 대화",
  blockName: "코치 대화",
  blockMinHeight: 480,
} as const;

/** 코치 대화 — 내 보유로 답하는 화면이라 검색에 싣지 않는다 */
export const coachChatMetadata = privatePageMetadata("코치 대화");

/**
 * 대화 옆 고정 칸 문구(2026-11-19 재설계). ~~PC 격자 칸(`COACH_GRID_PANELS` · 기본 배치)~~ — 끌어 옮기는 격자를 대화 화면에서 뺐다(사용자 결정).
 * 격자 위젯 · 배치 저장 경로는 남아 있다(다른 화면이 쓸 때까지 — 체크리스트 기록)
 */
export const COACH_CHAT_SIDE = {
  label: "오늘의 추천 · 포지션 요약",
  cardTitle: "오늘의 추천",
  positionTitle: "포지션 요약",
  /** 오늘의 추천 칸 — 브리핑을 읽는 중 · 못 읽음 */
  cardLoading: "오늘의 추천을 불러오는 중이에요",
  cardFailed: "오늘의 추천을 불러오지 못했어요.",
  /** 리포트로 — 다른 페이지로 가는 줄 */
  reportLink: "코치 리포트에서 보기",
} as const;
