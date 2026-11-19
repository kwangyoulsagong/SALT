/**
 * 코치 대화 보관 한도(`SRV-REQ-028` FR-30 · `DB-REQ-022` FR-25 — 사용자 2026-11-19 "대화도 어느 정도 되면 날려버려야").
 *
 * 사람마다 **최근 질문 100개 · 90일** 중 먼저 닿는 쪽까지만 둔다. 숫자는 여기 한 곳 — 화면은 목록 응답의 `keep` 으로 받는다.
 * 대화는 질문할 때만 늘어나므로 질문마다 오래된 것을 지운다(cron 0 — 생성 기록 90일 보존과 같은 방식).
 */
export const COACH_HISTORY_KEEP_QUESTIONS = 100;
export const COACH_HISTORY_KEEP_DAYS = 90;

const DAY_MS = 86_400_000;

/**
 * 지울 경계 — 이 시각보다 **앞인** 메시지를 지운다. 경계는 늘 남길 질문 하나의 시각이라 질문 · 답 짝이 갈라지지 않는다
 * (답은 질문 1ms 뒤에 저장된다 — 질문 경계에서 자르면 남은 질문의 답도 남고, 지운 질문의 답도 같이 지워진다).
 *
 * @param questionTimesDesc 이 사람의 질문 시각, 최신이 앞 — 적어도 `keepQuestions` 개(더 있어도 된다)
 * @returns 남길 질문이 없으면 `null`(지우지 않는다 — 질문 직후에만 부르므로 실제론 늘 하나 이상)
 */
export const coachHistoryCutoff = (
  questionTimesDesc: readonly Date[],
  now: Date,
  keepQuestions: number = COACH_HISTORY_KEEP_QUESTIONS,
  keepDays: number = COACH_HISTORY_KEEP_DAYS,
): Date | null => {
  const since = now.getTime() - keepDays * DAY_MS;
  const kept = questionTimesDesc.slice(0, Math.max(0, keepQuestions)).filter((t) => t.getTime() >= since);
  return kept.length > 0 ? kept[kept.length - 1]! : null;
};
