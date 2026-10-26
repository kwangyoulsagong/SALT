import type { SizeCheckResult, SizingUnavailableReason } from "@repo/core/coach";

import { formatPrice } from "@/shared/lib";
import { StatusLine } from "@repo/ui/statusLine";

import { formatFineRate, formatQuantity, formatRatio, formatSignedRate } from "../lib";
import { RISK_MESSAGES } from "../model";
import { hint, line, lines, lineStrong, pending as pendingStyle, stack } from "./TradeRisk.css";

const { size: SIZE } = RISK_MESSAGES;
const { gap: GAP } = SIZE;

/** `2021-10-27T…` → `2021년 10월`. 날짜 부분만 잘라 쓴다 — 시간대에 따라 문자열이 갈리지 않는다 */
const formatSince = (iso: string): string => GAP.since(iso.slice(0, 4), iso.slice(5, 7));

interface SizeCheckLinesProps {
  /** `null` 이면 아직 계산하지 않았다(입력이 모자라다) — 안내 한 줄만 */
  result: SizeCheckResult | null;
  /** 새 입력으로 다시 계산하는 중. 이전 결과를 흐리게 두고 자리를 지킨다 */
  isPending?: boolean;
  /** 입력이 모자랄 때 보이는 한 줄 */
  idleHint: string;
}

/**
 * 사이즈 계산 결과 줄 (F009 FR-4~7 · `FE-REQ-039`). **표시만 한다** — 금액 · 비율은 서버가 계산했다.
 *
 * - 못 구한 값은 줄을 빼고 사유를 회색 한 줄로 — 0 · 기본값으로 채우지 않는다(FR-8)
 * - 같은 사유(예: 예산 미설정)가 여러 필드에 붙어도 한 번만 말한다
 * - 결과가 바뀌면 `aria-live="polite"` 로 읽는다(비기능 · 접근성)
 * - 켈리는 그리지 않는다 — 폼이 승률 · 손익비를 받지 않는다(추가 입력 2개 이내, FR-6 은 입력이 없으면 섹션도 없다)
 */
export const SizeCheckLines = ({ result, isPending = false, idleHint }: SizeCheckLinesProps) => {
  const body = () => {
    if (result === null) return <p className={hint}>{isPending ? SIZE.calculating : idleHint}</p>;
    if (result.status === "unavailable") return <StatusLine kind="error">{SIZE.unavailable}</StatusLine>;

    const rows: { key: string; text: string; strong?: boolean }[] = [];
    if (result.maxLossKrw !== null) {
      rows.push({ key: "maxLoss", text: SIZE.maxLoss(formatPrice(result.maxLossKrw)), strong: true });
    }
    // 국내 주식 — 손절가에서 안 팔렸을 때 두 줄을 최대 손실 바로 아래 같은 굵기로(F011 FR-45 "나란히")
    const gaps = result.maxLossKrw !== null ? result.gapScenarios : null;
    if (gaps) {
      rows.push({
        key: "gapLimitDown",
        text: GAP.limitDown(formatSignedRate(gaps.limitDown.gapRate), formatPrice(gaps.limitDown.maxLossKrw)),
        strong: true,
      });
      if (gaps.historicalGap) {
        const { since, gapRate, maxLossKrw, worstGapRate, sample } = gaps.historicalGap;
        rows.push({
          key: "gapHistorical",
          text: GAP.historical(formatSince(since), formatSignedRate(gapRate), formatPrice(maxLossKrw)),
          strong: true,
        });
        rows.push({ key: "gapWorst", text: GAP.worst(formatSignedRate(worstGapRate), sample) });
      }
    }
    if (result.perTradeBudgetRate !== null) {
      rows.push({ key: "perTrade", text: SIZE.perTradeBudget(formatRatio(result.perTradeBudgetRate)) });
    }
    if (result.monthlyBudgetRemainingRate !== null) {
      rows.push({ key: "monthly", text: SIZE.monthlyRemaining(formatRatio(result.monthlyBudgetRemainingRate)) });
    }
    if (result.projectedWeight !== null) {
      rows.push({
        key: "weights",
        text:
          result.volTargetWeight !== null
            ? SIZE.weights(formatRatio(result.volTargetWeight), formatRatio(result.projectedWeight))
            : SIZE.projectedOnly(formatRatio(result.projectedWeight)),
      });
    }
    if (result.referenceMaxQuantity) {
      rows.push({
        key: "refQty",
        text: SIZE.referenceQuantity(
          formatQuantity(result.referenceMaxQuantity.value),
          result.referenceMaxQuantity.limitedBy,
        ),
      });
    }
    if (result.consecutiveLoss) {
      const { count, amountKrw, monthlyBudgetRate } = result.consecutiveLoss;
      rows.push({
        key: "streak",
        text: [
          SIZE.streak(count, formatPrice(amountKrw)),
          monthlyBudgetRate !== null ? SIZE.streakOfBudget(formatRatio(monthlyBudgetRate)) : null,
        ]
          .filter(Boolean)
          .join(" "),
      });
    }

    // 사유는 한 번씩만. 매도는 "계산 대상 아님"을 한 번만 말한다
    const reasons = [...new Set(Object.values(result.unavailable))].filter(
      (reason): reason is SizingUnavailableReason => reason !== undefined,
    );
    const notes: string[] = reasons.map((reason) => SIZE.reasons[reason]);
    if (gaps) {
      if (gaps.historicalGapUnavailable) notes.push(GAP.historicalUnavailable);
      notes.push(GAP.note);
    }
    if (result.maxLossKrw !== null && result.assumptions.feeRatePerSide !== null) {
      const fee = formatFineRate(result.assumptions.feeRatePerSide);
      notes.push(gaps ? GAP.assumptions(fee) : SIZE.assumptions(fee));
    }
    if (result.volTargetWeight !== null && result.assumptions.targetVolatilityIsDefault && result.assumptions.targetVolatility !== null) {
      notes.push(SIZE.targetVolDefault(formatRatio(result.assumptions.targetVolatility)));
    }

    return (
      <>
        {rows.length > 0 && (
          <ul className={lines}>
            {rows.map((row) => (
              <li key={row.key} className={row.strong ? lineStrong : line}>
                {row.text}
              </li>
            ))}
          </ul>
        )}
        {notes.map((note) => (
          <p key={note} className={hint}>
            {note}
          </p>
        ))}
      </>
    );
  };

  return (
    <div
      aria-live="polite"
      aria-busy={isPending}
      className={isPending && result ? `${stack} ${pendingStyle}` : stack}
    >
      {body()}
    </div>
  );
};
