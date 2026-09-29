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
  notes,
}: {
  name: string;
  value: string;
  muted: boolean;
  progress: number | null;
  status: GaugeStatus;
  detail?: string | null;
  /** 상태 줄 아래 보조 줄(뜻 · 계산 범위). 빈 값은 뺀다 */
  notes?: Array<string | null>;
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
      {(notes ?? []).filter(Boolean).map((note) => (
        <span key={note} className={gaugeStatus.normal}>
          {note}
        </span>
      ))}
    </li>
  );
};

/**
 * 리스크 예산 게이지 4 (F009 FR-17 · FR-23 · FR-24 · `FE-REQ-039` + F010 BTC 베타 합 `FE-REQ-040` FR-2). **표시만 한다.**
 *
 * - 기준이 없으면 `기준을 정하면 보여요` — 0 · 기본값으로 막대를 그리지 않는다(FR-2)
 * - 넘어도 막지 않는다. 막대 색 + "기준을 넘었어요" 글자뿐(FR-23)
 * - 막대는 100% 에서 잘린다(`ProgressBar`) — 넘친 정도는 숫자가 말한다
 */
export const RiskGaugeList = ({ view }: { view: RiskBudgetView }) => {
  const { drawdown, concentration, turnover, btcBeta } = view.gauges;

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
  const betaReady = btcBeta.status === "ok" && btcBeta.betaSum !== null;

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
      {/* 예산이 없는 측정값 — 막대 · "넘었어요"가 없다. 모르는 베타는 서버가 합에서 뺐다(1 로 채우지 않음) */}
      <GaugeItem
        name={GAUGE.btcBeta}
        muted={!betaReady}
        value={betaReady ? GAUGE.btcBetaValue(formatTimes(btcBeta.betaSum ?? 0)) : GAUGE.status.insufficient_data}
        progress={null}
        status="ok"
        detail={
          betaReady && btcBeta.btcEquivalentKrw !== null ? GAUGE.btcBetaEquivalent(formatPrice(btcBeta.btcEquivalentKrw)) : null
        }
        notes={[
          betaReady ? GAUGE.btcBetaHint : null,
          betaReady && btcBeta.missingSymbols.length > 0 && btcBeta.coveredWeight !== null
            ? GAUGE.btcBetaCovered(formatRatio(btcBeta.coveredWeight), btcBeta.missingSymbols.join(", "))
            : null,
        ]}
      />
    </ul>
  );
};
