/**
 * 진입 전 체크리스트 — FEATURE-009 FR-30 (`SRV-REQ-038` FR-10).
 *
 * 질문은 **본인 실수 태그**에서 자란다 — 남의 통계가 아니다. 손익 합이 음수인 태그를 비용이 큰 순서로
 * 셋까지, 태그마다 정해 둔 질문 한 줄. 여기에 프리모템 한 문항(답은 계획의 `invalidation` 에 들어간다).
 *
 * 선택 펼침이고 체크 여부는 **기록만** 한다(`TradePlan.checklist`). 체크하지 않아도 저장은 그대로 된다 —
 * 막지 않는다(2026-09-08 결정). 질문은 명령형이 아니라 물음이다(`languageGuard` 테스트).
 */

import type { TagCost } from "./mirror";

export const ENTRY_CHECKLIST_LIMIT = 3;

/** 태그 → 질문. 여기 없는 태그(사용자 정의)는 이름을 넣은 공통 질문 */
export const ENTRY_CHECKLIST_QUESTIONS: Readonly<Record<string, string>> = {
  chasing: "최근 이틀 고점 가까이에서 사는 거래인가요?",
  averaging_down: "평단보다 싸져서 더 사는 거래인가요?",
  revenge: "손실로 판 지 하루가 안 된 종목인가요?",
  off_plan: "손절가나 이유를 정하지 않은 거래인가요?",
  late_night: "밤늦게 하는 거래인가요?",
};

export const PREMORTEM_QUESTION = "3개월 뒤 이 거래가 실패했다면 이유는 뭘까요?";

export interface EntryChecklistItem {
  tag: string;
  question: string;
  /** 이 태그가 붙은 청산 수 · 손익 합(원) — 질문이 왜 나왔는지 */
  count: number;
  netPnlKrw: TagCost["netPnlKrw"];
}

export interface EntryChecklist {
  items: EntryChecklistItem[];
  premortemQuestion: string;
}

export const questionFor = (tag: string): string =>
  ENTRY_CHECKLIST_QUESTIONS[tag] ?? `'${tag}' 태그가 붙을 만한 거래인가요?`;

/** `costs` 는 `tagCosts` 결과(비용이 큰 태그가 앞) */
export const entryChecklist = (costs: TagCost[]): EntryChecklist => ({
  items: costs
    .filter((cost) => cost.netPnlKrw.isNegative())
    .slice(0, ENTRY_CHECKLIST_LIMIT)
    .map((cost) => ({ tag: cost.tag, question: questionFor(cost.tag), count: cost.count, netPnlKrw: cost.netPnlKrw })),
  premortemQuestion: PREMORTEM_QUESTION,
});

/** 계획에 남기는 체크 기록. 보인 질문과 체크한 질문(태그) */
export interface PlanChecklist {
  shown: string[];
  checked: string[];
}
