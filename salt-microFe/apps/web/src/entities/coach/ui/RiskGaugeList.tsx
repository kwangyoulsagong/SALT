import type { GaugeStatus, RiskBudgetView, RiskContributionView } from "@repo/core/coach";
import { ProgressBar } from "@repo/ui/progressBar";

import { formatPrice } from "@/shared/lib";

import { formatRatio, formatScore, formatSignedRate, formatTimes } from "../lib";
import { RISK_MESSAGES } from "../model";
import { CaseIdentity } from "./CaseIdentity";
import {
  gauge,
  gaugeLabel,
  gaugeList,
  gaugeStatus,
  gaugeValue,
  gaugeValueMuted,
  shareRow,
  shareValue,
} from "./TradeRisk.css";

const { gauge: GAUGE } = RISK_MESSAGES;
const MINUS = "−";
/** 흔들림 몫은 이만큼만 줄로 — 나머지는 수만 */
const SHARE_ROWS = 4;

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
 * 흔들림 몫(F009 FR-26) — 종목마다 로고 · 이름과 몫 · 비중. 음수 몫은 "줄임"을 글자로 붙인다(부호만으로 뜻을 전하지 않는다).
 * 종목이 하나면 몫이 늘 100% 라 칸을 그리지 않는다
 */
const RiskShareItem = ({ contributions }: { contributions: RiskContributionView[] }) => {
  // 몫 순 정렬에서 음수(줄인 종목)는 맨 끝이다 — 줄 제한에 묻히지 않게 늘 보인다
  const adding = contributions.filter((item) => item.share >= 0);
  const reducing = contributions.filter((item) => item.share < 0);
  const shown = [...adding.slice(0, SHARE_ROWS), ...reducing];
  const rest = contributions.length - shown.length;
  return (
    <li className={gauge}>
      <span className={gaugeLabel}>{GAUGE.riskShare}</span>
      {shown.map((item) => {
        const weight = formatRatio(item.weight);
        return (
          <span key={item.symbol} className={shareRow}>
            <CaseIdentity symbol={item.symbol} name={item.name} logoUrl={item.logoUrl} />
            <span className={shareValue}>
              {item.share < 0
                ? GAUGE.riskShareReducing(formatRatio(-item.share), weight)
                : GAUGE.riskShareLine(formatRatio(item.share), weight)}
            </span>
          </span>
        );
      })}
      {rest > 0 && <span className={gaugeStatus.normal}>{GAUGE.riskShareMore(rest)}</span>}
      <span className={gaugeStatus.normal}>{GAUGE.riskShareHint}</span>
    </li>
  );
};

/**
 * 리스크 예산 게이지 5 + 측정 2 (F009 FR-17 · FR-23 · FR-24 · `FE-REQ-039` + F010 BTC 베타 합 `FE-REQ-040` FR-2 + F011 보유 합산 변동성
 * `FE-REQ-041` FR-29 + F009 FR-26 흔들림 몫 · 나빴던 날 평균 `FE-REQ-039`). **표시만 한다.**
 *
 * - 기준이 없으면 `기준을 정하면 보여요` — 0 · 기본값으로 막대를 그리지 않는다(FR-2)
 * - 넘어도 막지 않는다. 막대 색 + "기준을 넘었어요" 글자뿐(FR-23)
 * - 막대는 100% 에서 잘린다(`ProgressBar`) — 넘친 정도는 숫자가 말한다
 */
export const RiskGaugeList = ({ view }: { view: RiskBudgetView }) => {
  const { drawdown, concentration, turnover, btcBeta, portfolioVolatility: volatility } = view.gauges;

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
  // 옛 BFF 는 이 칸을 주지 않는다 — 없으면 줄이 없다
  const volatilityReady = volatility?.status === "ok" && volatility.realized !== null && volatility.upper !== null;
  // FR-26 — 옛 BFF 는 두 칸을 주지 않는다. 값이 없으면 칸이 없다(빈 칸 문구를 늘리지 않는다)
  const contributions = volatilityReady ? (volatility.contributions ?? []) : [];
  const tail = volatilityReady ? (volatility.tail ?? null) : null;

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
      {/* F011 FR-46 — 범위만 보인다. 목표 변동성과 나란히 두지만 넘었다 · 아니다를 말하지 않는다 */}
      {volatility && (
        <GaugeItem
          name={GAUGE.portfolioVolatility}
          muted={!volatilityReady}
          value={
            volatilityReady
              ? GAUGE.portfolioVolatilityValue(formatRatio(volatility.realized ?? 0), formatRatio(volatility.upper ?? 0))
              : GAUGE.status.insufficient_data
          }
          progress={null}
          status="ok"
          detail={
            volatilityReady && view.settings.targetVolatility !== null
              ? GAUGE.portfolioVolatilityTarget(formatRatio(view.settings.targetVolatility))
              : null
          }
          notes={[
            volatilityReady ? GAUGE.portfolioVolatilityHint : null,
            volatilityReady && volatility.crossCorrelation !== null
              ? GAUGE.portfolioVolatilityCross(formatScore(volatility.crossCorrelation))
              : null,
            volatilityReady && volatility.grid === "krx_trading_day" ? GAUGE.portfolioVolatilityGrid : null,
            volatilityReady && volatility.missingSymbols.length > 0 && volatility.coveredWeight !== null
              ? GAUGE.portfolioVolatilityCovered(formatRatio(volatility.coveredWeight), volatility.missingSymbols.join(", "))
              : null,
          ]}
        />
      )}
      {contributions.length > 1 && <RiskShareItem contributions={contributions} />}
      {/* FR-26 과거 CVaR — 금액은 서버가 냈다. 확률 · 막대 · "넘었어요"가 없다 */}
      {tail && (
        <GaugeItem
          name={GAUGE.tailLoss}
          muted={false}
          value={GAUGE.tailLossValue(
            tail.averageKrw < 0 ? `${MINUS}${formatPrice(-tail.averageKrw)}` : formatPrice(tail.averageKrw),
          )}
          progress={null}
          status="ok"
          detail={GAUGE.tailLossDetail(
            tail.days,
            GAUGE.tailLossUnit[volatility.grid === "krx_trading_day" ? "krx_trading_day" : "calendar_day"],
            formatSignedRate(tail.averageRate),
          )}
          notes={[
            GAUGE.tailLossWorst(formatSignedRate(tail.worstRate), tail.worstOn.slice(0, 10).replaceAll("-", ".")),
            GAUGE.tailLossHint,
          ]}
        />
      )}
    </ul>
  );
};
