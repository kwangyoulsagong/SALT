"use client";

import type { ReportRisk } from "@repo/core/coach";
import { Chip } from "@repo/ui/chip";
import { FlexBox } from "@repo/ui/flexBox";
import { Text } from "@repo/ui/text";
import { useState, type ReactNode } from "react";

import { COACH_MESSAGES } from "../model";
import { cautionDot, factBody, factItem, factList, factMeta } from "./CoachReport.css";

const { report: REPORT } = COACH_MESSAGES;

/**
 * 리스크 목록 — `severity` 가 큰 것부터 (`FE-REQ-026` 화면 구조).
 *
 * 문장은 서버가 만든 것이다. 정렬은 표시 순서일 뿐 값을 만들지 않는다. `severity` 숫자는
 * 그리지 않는다 — 점수처럼 읽힌다.
 *
 * 자산별 필터(`FEATURE-004` FR-3) — 칩은 목록에 나온 종목만. 종목이 없는 주의(포트폴리오
 * 단위)는 "전체"에서만 보인다. 걸러도 목록이 그대로면(종목 하나뿐) 칩을 그리지 않는다.
 */
export const ReportRiskList = ({
  risks,
  renderIdentity,
}: {
  risks: readonly ReportRisk[];
  /** 종목이 걸린 주의 사항이면 그 종목 자리(로고 · 이름) — 위젯이 넣는다 */
  renderIdentity: (symbol: string, size: "sm" | "md") => ReactNode;
}) => {
  const [selected, setSelected] = useState<string | null>(null);

  if (risks.length === 0) return <Text color="tertiary">{REPORT.noRisks}</Text>;

  const symbols = [...new Set(risks.flatMap((risk) => (risk.symbol ? [risk.symbol] : [])))];
  const canFilter = symbols.length > 1 || (symbols.length === 1 && risks.some((risk) => !risk.symbol));
  // 다시 받은 리포트에 고른 종목이 없으면 전체로 돌아간다
  const active = canFilter && selected && symbols.includes(selected) ? selected : null;
  const ordered = risks
    .filter((risk) => active === null || risk.symbol === active)
    .sort((a, b) => b.severity - a.severity);

  const list = (
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

  if (!canFilter) return list;

  return (
    <FlexBox direction="column" gap="md">
      <div role="group" aria-label={REPORT.risksFilterLabel}>
        <FlexBox gap="sm" wrap="wrap">
          <Chip size="sm" selected={active === null} onPress={() => setSelected(null)}>
            {REPORT.risksFilterAll}
          </Chip>
          {symbols.map((symbol) => (
            <Chip key={symbol} size="sm" selected={active === symbol} onPress={() => setSelected(symbol)}>
              {renderIdentity(symbol, "sm")}
            </Chip>
          ))}
        </FlexBox>
      </div>
      {list}
    </FlexBox>
  );
};

export default ReportRiskList;
