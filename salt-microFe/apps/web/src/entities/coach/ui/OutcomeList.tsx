import type { DecisionOutcomeView } from "@repo/core/coach";
import { Text } from "@repo/ui/text";
import type { ReactNode } from "react";

import { effectiveOutcomeTags, formatShortDate, formatSignedDecimal, formatSignedKrw, formatSignedRate, formatTimes, tagName } from "../lib";
import { MIRROR_MESSAGES } from "../model";
import { outcomeHead, outcomeItem, outcomeList, outcomeMeta, outcomePnl, tagChip } from "./Mirror.css";

const { outcomes: OUT } = MIRROR_MESSAGES;

interface OutcomeListProps {
  outcomes: readonly DecisionOutcomeView[];
  /** 종목 자리(로고 · 이름) — 시세 슬라이스가 갖고 있어 조합하는 위젯이 넣는다. 종목 자리에는 로고가 늘 있다 */
  renderIdentity: (symbol: string, size: "sm" | "md") => ReactNode;
  /** 태그 자리. 고치는 기능(`features/confirm-outcome-tags`)을 위젯이 넣는다. 없으면 태그만 보인다 */
  renderTags?: (outcome: DecisionOutcomeView) => ReactNode;
}

/** 태그 칩 — 확정 전이면 "자동 후보", 확정했으면 "확정"을 글자로 붙인다(색만으로 가르지 않는다) */
export const OutcomeTagChips = ({ outcome }: { outcome: DecisionOutcomeView }) => {
  const tags = effectiveOutcomeTags(outcome);
  return (
    <span className={outcomeMeta}>
      <span>{outcome.tagsConfirmedAt ? OUT.confirmedLabel : OUT.autoLabel}</span>
      {tags.length === 0 ? (
        <span>{OUT.noTags}</span>
      ) : (
        tags.map((tag) => (
          <span key={tag} className={tagChip}>
            {tagName(tag)}
          </span>
        ))
      )}
    </span>
  );
};

/**
 * 청산별 결과 · 태그 (F009 FR-14 · FR-18 · `FE-REQ-039`). **표시만 한다** — 손익 · R · 30일 보유 대비는 서버 값이다.
 * 매입가는 싣지 않는다 — 손익 금액과 수익률만(FR-27 방향).
 */
export const OutcomeList = ({ outcomes, renderIdentity, renderTags }: OutcomeListProps) => {
  if (outcomes.length === 0) return <Text color="tertiary">{OUT.empty}</Text>;

  return (
    <ul className={outcomeList}>
      {outcomes.map((outcome) => {
        const closedOn = formatShortDate(outcome.closedAt);
        const meta = [
          closedOn ? OUT.closedOn(closedOn) : null,
          outcome.holdingDays !== null ? OUT.holdingDays(formatTimes(outcome.holdingDays)) : null,
          outcome.netReturn !== null ? formatSignedRate(outcome.netReturn) : null,
          outcome.rMultiple !== null ? OUT.rMultiple(formatSignedDecimal(outcome.rMultiple)) : null,
          outcome.heldReturn30d !== null ? OUT.heldReturn(formatSignedRate(outcome.heldReturn30d)) : null,
          outcome.adherenceLabel ? OUT.adherence[outcome.adherenceLabel] : null,
        ].filter((item): item is string => Boolean(item));
        return (
          <li key={outcome.id} className={outcomeItem}>
            <div className={outcomeHead}>
              {renderIdentity(outcome.symbol, "sm")}
              <span className={outcomePnl}>{OUT.pnl(formatSignedKrw(outcome.netPnlKrw))}</span>
            </div>
            <span className={outcomeMeta}>
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </span>
            {renderTags ? renderTags(outcome) : <OutcomeTagChips outcome={outcome} />}
          </li>
        );
      })}
    </ul>
  );
};
