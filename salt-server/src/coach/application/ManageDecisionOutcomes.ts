import {
  DecisionOutcomeNotFoundError,
  normalizeTags,
  type DecisionOutcome,
  type DecisionOutcomeStore,
} from "../domain";

/**
 * 결정 결과 목록 · 태그 확정 — FEATURE-009 FR-18 (`SRV-REQ-038` FR-9).
 *
 * 확정한 태그가 미러의 태그 비용에 쓰인다. 자동 후보(`autoTags`)는 원본으로 남는다 — 사용자 수정률이 자동 태그
 * 정확도의 대리 지표다(관측성). 빈 배열로 확정하면 "실수 없음"이다(확정 전과 다르다).
 */

export const DECISION_OUTCOME_LIST_MAX = 100;

export class ListDecisionOutcomes {
  constructor(private readonly outcomes: DecisionOutcomeStore) {}

  execute(userId: string, limit: number): Promise<DecisionOutcome[]> {
    return this.outcomes.listOwned(userId, Math.min(limit, DECISION_OUTCOME_LIST_MAX));
  }
}

export class ConfirmOutcomeTags {
  constructor(
    private readonly outcomes: DecisionOutcomeStore,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(userId: string, outcomeId: string, tags: string[]): Promise<DecisionOutcome> {
    const updated = await this.outcomes.confirmTags(userId, outcomeId, normalizeTags(tags), this.now());
    if (!updated) throw new DecisionOutcomeNotFoundError();
    return updated;
  }
}
