import type { KrBehaviorMirrorView } from "@repo/core/coach";

import { formatFineRate, formatRatio, formatSignedRate, formatTimes } from "../lib";
import { KR_MIRROR_MESSAGES } from "../model";
import { mirrorList } from "./Mirror.css";
import { MirrorItem, worse } from "./MirrorLines";

const K = KR_MIRROR_MESSAGES;

/** 익절 · 손절 — 보유 거래일이 둘 다 있으면 그것이 본문, 실현 비율은 보조 줄 */
const DispositionItem = ({ disposition }: { disposition: NonNullable<KrBehaviorMirrorView["disposition"]> }) => {
  const holdingText =
    disposition.gainHoldingDays.value !== null && disposition.lossHoldingDays.value !== null
      ? K.disposition.holding(formatTimes(disposition.gainHoldingDays.value), formatTimes(disposition.lossHoldingDays.value))
      : null;
  const ratioText =
    disposition.pgr.value !== null && disposition.plr.value !== null
      ? K.disposition.ratio(formatRatio(disposition.pgr.value), formatRatio(disposition.plr.value))
      : null;
  return (
    <MirrorItem
      label={K.disposition.label}
      sampleSize={disposition.pgr.sampleSize}
      sampleText={
        holdingText
          ? K.disposition.sample(disposition.gainHoldingDays.sampleSize, disposition.lossHoldingDays.sampleSize)
          : undefined
      }
      status={
        holdingText ? worse(disposition.gainHoldingDays, disposition.lossHoldingDays) : worse(disposition.pgr, disposition.plr)
      }
      text={holdingText ?? ratioText}
      sub={[holdingText ? ratioText : null]}
    />
  );
};

/**
 * 국내 주식 거래 미러 (F011 FR-47 · `FE-REQ-041` FR-28). **표시만 한다** — 숫자는 서버가 거래일로 셌다.
 *
 * 순서는 국내 근거가 직접적인 순: 회전율 → 처분효과(익절 · 손절, 산 다음 거래일 매도율) → 추격(40거래일) → 복권형.
 * 표본 배지 · 흐림 규칙은 코인 미러(`MirrorItem`)와 같다. 참고값은 출처가 온 줄만 단다.
 */
export const KrMirrorLines = ({ view }: { view: KrBehaviorMirrorView }) => {
  const { turnover, disposition, nextDaySell, chase, lottery } = view;
  const turnoverBaseline = turnover.baseline;
  const sellBaseline = nextDaySell.baseline;
  const chaseBaseline = chase.baseline;
  const evidence = lottery.evidence;


  return (
    <ul className={mirrorList}>
      <MirrorItem
        label={K.turnover.label}
        sampleSize={turnover.dailyTurnover.sampleSize}
        status={turnover.dailyTurnover.status}
        text={
          turnover.dailyTurnover.value !== null && turnover.windowTradingDays !== null
            ? K.turnover.line(turnover.windowTradingDays, formatFineRate(turnover.dailyTurnover.value))
            : null
        }
        sub={[
          turnoverBaseline
            ? K.turnover.baseline(
                turnoverBaseline.source,
                turnoverBaseline.period,
                formatFineRate(turnoverBaseline.newRetailDailyTurnover),
                formatFineRate(turnoverBaseline.marketDailyTurnover),
              )
            : null,
        ]}
      />
      {disposition && <DispositionItem disposition={disposition} />}
      <MirrorItem
        label={K.nextDaySell.label}
        sampleSize={nextDaySell.gainSellRate.sampleSize + nextDaySell.lossSellRate.sampleSize}
        sampleText={K.nextDaySell.sample(nextDaySell.gainSellRate.sampleSize, nextDaySell.lossSellRate.sampleSize)}
        status={worse(nextDaySell.gainSellRate, nextDaySell.lossSellRate)}
        text={
          nextDaySell.gainSellRate.value !== null && nextDaySell.lossSellRate.value !== null
            ? K.nextDaySell.line(formatRatio(nextDaySell.gainSellRate.value), formatRatio(nextDaySell.lossSellRate.value))
            : null
        }
        sub={[
          sellBaseline
            ? K.nextDaySell.baseline(
                sellBaseline.source,
                sellBaseline.period,
                formatRatio(sellBaseline.gainSellRate),
                formatRatio(sellBaseline.lossSellRate),
              )
            : null,
        ]}
      />
      <MirrorItem
        label={K.chase.label}
        sampleSize={chase.avgPriorReturn.sampleSize}
        status={chase.avgPriorReturn.status}
        text={
          chase.avgPriorReturn.value !== null && chase.medianPriorReturn.value !== null
            ? K.chase.line(formatSignedRate(chase.avgPriorReturn.value), formatSignedRate(chase.medianPriorReturn.value))
            : null
        }
        sub={[
          chase.excluded > 0 ? K.chase.excluded(chase.excluded) : null,
          chaseBaseline
            ? K.chase.baseline(chaseBaseline.source, chaseBaseline.period, formatSignedRate(chaseBaseline.priorReturn))
            : null,
        ]}
      />
      <MirrorItem
        label={K.lottery.label}
        sampleSize={lottery.buyShare.sampleSize}
        status={lottery.buyShare.status}
        text={
          lottery.buyShare.value !== null && lottery.marketShare !== null
            ? K.lottery.line(formatRatio(lottery.buyShare.value), formatRatio(lottery.marketShare))
            : null
        }
        sub={[
          lottery.lookbackMonths !== null ? K.lottery.definition(lottery.lookbackMonths) : null,
          lottery.unknownBuys > 0 ? K.lottery.unknown(lottery.unknownBuys) : null,
          evidence ? K.lottery.evidence(evidence.source, evidence.period, formatSignedRate(evidence.excessReturn)) : null,
        ]}
      />
    </ul>
  );
};
