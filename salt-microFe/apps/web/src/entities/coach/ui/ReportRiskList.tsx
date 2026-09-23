import type { ReportRisk } from "@repo/core/coach";
import { Text } from "@repo/ui/text";

import { COACH_MESSAGES } from "../model";
import { factItem, factList, factMeta } from "./CoachReport.css";

const { report: REPORT } = COACH_MESSAGES;

/**
 * 리스크 목록 — `severity` 가 큰 것부터 (`FE-REQ-026` 화면 구조).
 *
 * 문장은 서버가 만든 것이다. 정렬은 표시 순서일 뿐 값을 만들지 않는다. `severity` 숫자는
 * 그리지 않는다 — 점수처럼 읽힌다.
 */
export const ReportRiskList = ({ risks }: { risks: readonly ReportRisk[] }) => {
  if (risks.length === 0) return <Text color="tertiary">{REPORT.noRisks}</Text>;

  const ordered = [...risks].sort((a, b) => b.severity - a.severity);

  return (
    <ul className={factList}>
      {ordered.map((risk, index) => (
        <li key={`${risk.type}-${risk.symbol ?? ""}-${index}`} className={factItem}>
          {risk.symbol && <span className={factMeta}>{risk.symbol}</span>}
          <span>{risk.message}</span>
        </li>
      ))}
    </ul>
  );
};

export default ReportRiskList;
