import type { GaugeStatus, RiskBudgetView } from "@repo/core/coach";
import { ProgressBar } from "@repo/ui/progressBar";

import { formatPrice } from "@/shared/lib";

import { formatRatio, formatTimes } from "../lib";
import { RISK_MESSAGES } from "../model";
import {
  gauge,
  gaugeLabel,
  gaugeList,
  gaugeStatus,
  gaugeValue,
  gaugeValueMuted,
} from "./TradeRisk.css";

const { gauge: GAUGE } = RISK_MESSAGES;
const MINUS = "−";

/** 게이지 칸 하나 — 이름 · 값 · 막대(값이 있을 때만) · 상태 글자. 색만으로 뜻을 전하지 않는다 */
const GaugeItem = ({
  name,
  value,
  muted,
  progress,
  status,
  detail,
}: {
  name: string;
  value: string;
  muted: boolean;
  progress: number | null;
  status: GaugeStatus;
  detail?: string | null;
}) => {
  const exceeded = status === "exceeded";
  const statusText = [detail, GAUGE.status[status]].filter(Boolean).join(" · ");
  return (
    <li className={gauge}>
      <span className={gaugeLabel}>{name}</span>
      <span className={muted ? gaugeValueMuted : gaugeValue}>{value}</span>
      {progress !== null && (
        <ProgressBar
          value={progress}
          tone={exceeded ? "warning" : "neutral"}
          height={6}
          label={GAUGE.progressLabel(name)}
        />
      )}
      {statusText && <span className={gaugeStatus[exceeded ? "exceeded" : "normal"]}>{statusText}</span>}
    </li>
  );
};

/**
 * 리스크 예산 게이지 3 (F009 FR-17 · FR-23 · FR-24 · `FE-REQ-039`). **표시만 한다.**
 *
 * - 기준이 없으면 `기준을 정하면 보여요` — 0 · 기본값으로 막대를 그리지 않는다(FR-2)
 * - 넘어도 막지 않는다. 막대 색 + "기준을 넘었어요" 글자뿐(FR-23)
 * - 막대는 100% 에서 잘린다(`ProgressBar`) — 넘친 정도는 숫자가 말한다
 */
export const RiskGaugeList = ({ view }: { view: RiskBudgetView }) => {
  const { drawdown, concentration, turnover } = view.gauges;

  const drawdownReady =
    (drawdown.status === "ok" || drawdown.status === "exceeded") &&
    drawdown.usedKrw !== null &&
    drawdown.budgetKrw !== null;
  const usedText =
    drawdown.usedKrw !== null && drawdown.usedKrw > 0 ? `${MINUS}${formatPrice(drawdown.usedKrw)}` : "0";

  const concentrationReady =
    (concentration.status === "ok" || concentration.status === "exceeded") &&
    concentration.topSymbol !== null &&
    concentration.topWeight !== null &&
    concentration.limit !== null;

  const turnoverReady = turnover.status === "ok" && turnover.trailingYearTurnover !== null;

  return (
    <ul className={gaugeList}>
      <GaugeItem
        name={GAUGE.drawdown}
        muted={!drawdownReady}
        value={
          drawdownReady ? GAUGE.drawdownValue(usedText, formatPrice(drawdown.budgetKrw ?? 0)) : GAUGE.status[drawdown.status] || GAUGE.status.insufficient_data
        }
        progress={drawdownReady ? drawdown.usedRate : null}
        status={drawdownReady ? drawdown.status : "ok"}
        detail={
          drawdownReady && drawdown.usedRate !== null
            ? GAUGE.usedRate(formatRatio(drawdown.usedRate))
            : drawdown.missingCloses.length > 0
              ? GAUGE.missingCloses(drawdown.missingCloses.join(", "))
              : null
        }
      />
      <GaugeItem
        name={GAUGE.concentration}
        muted={!concentrationReady}
        value={
          concentrationReady
            ? GAUGE.concentrationValue(
                concentration.topSymbol ?? "",
                formatRatio(concentration.topWeight ?? 0),
                formatRatio(concentration.limit ?? 0),
              )
            : GAUGE.status[concentration.status] || GAUGE.status.insufficient_data
        }
        progress={concentrationReady ? concentration.topWeight : null}
        status={concentrationReady ? concentration.status : "ok"}
      />
      <GaugeItem
        name={GAUGE.turnover}
        muted={!turnoverReady}
        value={
          turnoverReady
            ? GAUGE.turnoverValue(formatTimes(turnover.trailingYearTurnover ?? 0))
            : GAUGE.status.insufficient_data
        }
        progress={null}
        status="ok"
        detail={
          turnoverReady && turnover.feesYearToDateKrw !== null && turnover.tradeCount !== null
            ? GAUGE.turnoverDetail(formatPrice(turnover.feesYearToDateKrw), turnover.tradeCount)
            : null
        }
      />
    </ul>
  );
};
