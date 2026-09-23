import type { ReportRisk } from "@repo/core/coach";
import { Text } from "@repo/ui/text";
import type { ReactNode } from "react";

import { COACH_MESSAGES } from "../model";
import { cautionDot, factBody, factItem, factList, factMeta } from "./CoachReport.css";

const { report: REPORT } = COACH_MESSAGES;

/**
 * 리스크 목록 — `severity` 가 큰 것부터 (`FE-REQ-026` 화면 구조).
 *
 * 문장은 서버가 만든 것이다. 정렬은 표시 순서일 뿐 값을 만들지 않는다. `severity` 숫자는
 * 그리지 않는다 — 점수처럼 읽힌다.
 */
export const ReportRiskList = ({
  risks,
  renderIdentity,
}: {
  risks: readonly ReportRisk[];
  /** 종목이 걸린 주의 사항이면 그 종목 자리(로고 · 이름) — 위젯이 넣는다 */
  renderIdentity: (symbol: string, size: "sm" | "md") => ReactNode;
}) => {
  if (risks.length === 0) return <Text color="tertiary">{REPORT.noRisks}</Text>;

  const ordered = [...risks].sort((a, b) => b.severity - a.severity);

  return (
    <ul className={factList}>
      {ordered.map((risk, index) => (
        <li key={`${risk.type}-${risk.symbol ?? ""}-${index}`} className={factItem}>
          <span className={cautionDot} aria-hidden="true" />
          <span className={factBody}>
            <span>{risk.message}</span>
            {risk.symbol && <span className={factMeta}>{renderIdentity(risk.symbol, "sm")}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default ReportRiskList;
