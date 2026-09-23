import type { ReportBehaviorFact } from "@repo/core/coach";
import { Text } from "@repo/ui/text";

import { formatPrice } from "@/shared/lib";

import { describeBehaviorFact } from "../lib";
import { COACH_MESSAGES } from "../model";
import { factItem, factList, factMeta } from "./CoachReport.css";

const { report: REPORT } = COACH_MESSAGES;

/**
 * 행동 기록 (`FE-REQ-026` G · FR-60~63). **사실 문장만** — 문장은 `describeBehaviorFact` 가
 * 서버 코드 + 수치로 만든다. 사람을 평가하는 말이 들어갈 자리가 없다(FR-61).
 *
 * 청구서 링크 없음(ADR-002). 문장으로 옮길 수 없는 줄은 빼고, 남는 것이 없으면 빈 상태 한 줄.
 *
 * FR-63("거래 3건 미만이면 기록이 부족하다")은 계약에 거래 수가 없어 가를 수 없다 — 빈 목록은
 * "기록된 패턴 없음" 한 문장으로 말한다.
 */
export const BehaviorFactList = ({ facts }: { facts: readonly ReportBehaviorFact[] }) => {
  const lines = facts.flatMap((fact, index) => {
    const text = describeBehaviorFact(fact);
    return text ? [{ key: `${fact.factCode}-${index}`, text, amount: fact.amountKrw }] : [];
  });

  if (lines.length === 0) return <Text color="tertiary">{REPORT.noBehavior}</Text>;

  return (
    <ul className={factList}>
      {lines.map((line) => (
        <li key={line.key} className={factItem}>
          <span>{line.text}</span>
          {line.amount !== null && (
            <span className={factMeta}>{REPORT.amount(formatPrice(line.amount))}</span>
          )}
        </li>
      ))}
    </ul>
  );
};

export default BehaviorFactList;
