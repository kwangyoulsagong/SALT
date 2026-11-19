import { bandLabel, bandRangeText, multiplierText } from "../lib/format";
import { PLAN_MESSAGES as M } from "../model/messages";
import type { PlanAsset, PlanBandRule, PlanIndicator } from "../model/types";
import { caption, currentRow, numberCell, table, td, th } from "./plan.css";

interface BandTableProps {
  asset: PlanAsset;
  indicator: PlanIndicator | null;
  rules: PlanBandRule[];
  currentKey: string | null;
}

/**
 * 밴드 표(`FE-REQ-022` FR-22 · 23) — 서버가 준 사전등록 줄 그대로(프론트 임계 상수 0, `FE-REQ-023` FR-4). 실제 `<table>` + `<caption>`.
 * 지금 밴드는 면 + "지금" 글자 둘 다
 */
export const BandTable = ({ asset, indicator, rules, currentKey }: BandTableProps) => {
  if (rules.length === 0) return null;
  const t = M.bandTable;
  return (
    <table className={table}>
      <caption className={caption}>{t.caption(M.asset[asset])}</caption>
      <thead>
        <tr>
          <th scope="col" className={th}>{t.band}</th>
          <th scope="col" className={th}>{t.range}</th>
          <th scope="col" className={`${th} ${numberCell}`}>{t.multiplier}</th>
        </tr>
      </thead>
      <tbody>
        {rules.map((rule, index) => {
          const isCurrent = rule.key === currentKey;
          return (
            <tr key={rule.key} className={isCurrent ? currentRow : undefined} aria-current={isCurrent ? "true" : undefined}>
              <td className={td}>
                {bandLabel(rule.key)}
                {isCurrent ? ` · ${t.current}` : ""}
              </td>
              <td className={td}>{bandRangeText(indicator, rules, index)}</td>
              <td className={`${td} ${numberCell}`}>{M.times(multiplierText(rule.multiplier))}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
