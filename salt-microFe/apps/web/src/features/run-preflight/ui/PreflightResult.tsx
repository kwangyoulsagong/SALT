import type { TradePreflightView } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import { StatusLine } from "@repo/ui/statusLine";

import { formatFineRate, formatSignedRate } from "@/entities/coach";
import { formatPrice } from "@/shared/lib";

import { formatRiskReward, formatSignedKrw } from "../lib";
import { RUN_PREFLIGHT_MESSAGES as MSG } from "../model";
import { hint, line, lines, lineStrong, pending as pendingStyle, stack, warningText } from "./Preflight.css";

interface PreflightResultProps {
  /** `null` 이면 아직 계산하지 않았다(금액 · 진입가가 모자라다) */
  result: TradePreflightView | null;
  isError: boolean;
  /** 새 입력으로 다시 계산하는 중. 이전 결과를 흐리게 두고 자리를 지킨다 */
  isPending: boolean;
  /** 목표가를 넣었는지 — 손익비 자리의 안내 문장을 고른다 */
  hasTarget: boolean;
}

/**
 * 주문 전 체크 결과 줄 (FR-154). **표시만 한다** — 비중 · 최대 손실 · 손익비 · 상한 판정은 전부 서버 값이다.
 *
 * - 상한 초과는 배지 한 개와 한 줄뿐이다. 막지 않는다(FR-156)
 * - 비율은 소수 2자리까지 — 정수로 반올림하면 상한 60% 를 60.4% 로 넘었는데 "60%" 로 보여 배지와 어긋난다
 * - 손절 · 목표가가 없어 못 구한 값은 0 이 아니라 안내 한 줄이다
 * - 목표 도달 시 손익은 부호를 붙인다 — 목표가를 진입가 아래에 적으면 서버가 음수를 준다(잘못 적은 값이 숨지 않게)
 * - 결과가 바뀌면 `aria-live="polite"` 로 읽힌다
 */
export const PreflightResult = ({ result, isError, isPending, hasTarget }: PreflightResultProps) => {
  const body = () => {
    if (isError) return <StatusLine kind="error">{MSG.unavailable}</StatusLine>;
    if (!result) return <p className={hint}>{isPending ? MSG.calculating : MSG.idleHint}</p>;

    const { calculation } = result;
    const overCap = result.checklist.some((item) => item.key === "concentration" && !item.passed);
    const cap = formatFineRate(calculation.maxSingleAssetWeight);
    // 손절 없음은 결과 줄 안내가 말한다 — 경고 줄로 두 번 말하지 않는다
    const warnings = result.warnings.filter((warning) => warning.code !== "missing_stop_price");

    return (
      <>
        <ul className={lines}>
          <li className={lineStrong}>
            {MSG.result.projectedWeight(formatFineRate(calculation.projectedWeight))}
            <Badge size="sm" tone={overCap ? "warning" : "neutral"}>
              {overCap ? MSG.result.overCap(cap) : MSG.result.withinCap(cap)}
            </Badge>
          </li>
          {calculation.maxLossAmount !== null && calculation.stopPrice !== null ? (
            <li className={lineStrong}>
              {MSG.result.maxLoss(formatPrice(calculation.stopPrice), formatPrice(calculation.maxLossAmount))}
            </li>
          ) : (
            <li className={line}>{MSG.result.noStop}</li>
          )}
          {calculation.maxLossOfTotalRate !== null && (
            <li className={line}>
              {MSG.result.maxLossOfTotal(
                MSG.result.totalScope[result.assetType],
                formatFineRate(calculation.maxLossOfTotalRate),
              )}
            </li>
          )}
          {calculation.targetGainAmount !== null &&
          calculation.targetGainRate !== null &&
          calculation.takeProfitPrices[0] !== undefined ? (
            <li className={line}>
              {MSG.result.targetGain(
                formatPrice(calculation.takeProfitPrices[0]),
                formatSignedKrw(calculation.targetGainAmount),
                formatSignedRate(calculation.targetGainRate),
              )}
            </li>
          ) : (
            !hasTarget && <li className={line}>{MSG.result.noTarget}</li>
          )}
          {calculation.riskRewardRatio !== null && (
            <li className={line}>{MSG.result.riskReward(formatRiskReward(calculation.riskRewardRatio))}</li>
          )}
        </ul>
        {warnings.map((warning) => (
          <p key={warning.code} className={warningText}>
            {MSG.warnings[warning.code]}
          </p>
        ))}
      </>
    );
  };

  return (
    <div aria-live="polite" aria-busy={isPending} className={isPending && result ? `${stack} ${pendingStyle}` : stack}>
      {body()}
    </div>
  );
};
