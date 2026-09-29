import type {
  BehaviorMirrorView,
  BrierView,
  LossAsymmetryView,
  MirrorMetric,
  MirrorStatus,
  ReportBehaviorFact,
  StreakView,
  TagCostView,
  TimingBucketView,
  TradeTimingView,
} from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import type { ReactNode } from "react";

import { formatPrice } from "@/shared/lib";

import {
  describeBehaviorFact,
  formatFineRate,
  formatRatio,
  formatScore,
  formatShortDate,
  formatSignedDecimal,
  formatSignedKrw,
  formatSignedRate,
  formatTimes,
  tagName,
} from "../lib";
import { MIRROR_MESSAGES } from "../model";
import {
  mirrorHead,
  mirrorItem,
  mirrorLabel,
  mirrorList,
  mirrorSub,
  mirrorText,
  mirrorTextMuted,
  tagCostList,
  tagCostRow,
} from "./Mirror.css";

const M = MIRROR_MESSAGES;

/** 표본 배지 — 표본 수는 늘, 부족하면 "표본 부족"을 글자로도 */
const SampleBadges = ({ sample, status }: { sample: string; status: MirrorStatus }) => (
  <>
    <Badge size="sm" tone="neutral">
      {sample}
    </Badge>
    {status === "insufficient_sample" && (
      <Badge size="sm" tone="warning">
        {M.insufficientSample}
      </Badge>
    )}
  </>
);

/** 미러 한 줄 — 이름 · 배지 · 본문 · 보조. 값이 없으면(`insufficient_data`) 본문 대신 "기록이 모자라". 월간 복기도 쓴다 */
export const MirrorItem = ({
  label,
  sampleSize,
  sampleText,
  status,
  text,
  sub,
  extra,
}: {
  label: string;
  sampleSize: number;
  /** 표본 배지 글자를 바꿀 때(익절 · 손절처럼 표본이 둘) */
  sampleText?: string;
  status: MirrorStatus;
  /** `undefined` 면 본문 줄이 없다(태그 손익처럼 `extra` 가 본문이다). `null` 이면 값이 없다 */
  text?: string | null;
  sub?: Array<string | null>;
  extra?: ReactNode;
}) => {
  const lines = (sub ?? []).filter((line): line is string => Boolean(line));
  return (
    <li className={mirrorItem}>
      <div className={mirrorHead}>
        <span className={mirrorLabel}>{label}</span>
        <SampleBadges sample={sampleText ?? M.sample(sampleSize)} status={status} />
      </div>
      {text === undefined ? null : status === "insufficient_data" || text === null ? (
        <p className={mirrorTextMuted}>{M.noData}</p>
      ) : (
        <>
          <p className={status === "ok" ? mirrorText : mirrorTextMuted}>{text}</p>
          {lines.map((line) => (
            <p key={line} className={mirrorSub}>
              {line}
            </p>
          ))}
        </>
      )}
      {extra}
    </li>
  );
};

/** 두 지표 중 나쁜 상태 — 한 줄에 둘을 쓰면 둘 다 확실할 때만 `ok` */
export const worse = (a: MirrorMetric, b: MirrorMetric): MirrorStatus =>
  a.status === "insufficient_data" || b.status === "insufficient_data"
    ? "insufficient_data"
    : a.status === "insufficient_sample" || b.status === "insufficient_sample"
      ? "insufficient_sample"
      : "ok";

const expectancy = (cost: TagCostView): string | null =>
  cost.avgR !== null
    ? M.tags.expectancyR(formatSignedDecimal(cost.avgR))
    : cost.avgReturn !== null
      ? M.tags.expectancyReturn(formatSignedRate(cost.avgReturn))
      : null;

export const TagCostRows = ({ costs }: { costs: readonly TagCostView[] }) => (
  <ul className={tagCostList}>
    {costs.map((cost) => (
      <li key={cost.tag} className={tagCostRow}>
        <span className={cost.status === "ok" ? mirrorText : mirrorTextMuted}>
          {M.tags.cost(tagName(cost.tag), formatSignedKrw(cost.netPnlKrw), cost.count)}
        </span>
        {expectancy(cost) && <span className={mirrorSub}>{expectancy(cost)}</span>}
        {cost.status === "insufficient_sample" && (
          <Badge size="sm" tone="warning">
            {M.insufficientSample}
          </Badge>
        )}
        {cost.noEdge && (
          <Badge size="sm" tone="down">
            {M.tags.noEdge}
          </Badge>
        )}
      </li>
    ))}
  </ul>
);

/**
 * "오를 확률" 채점 줄(FR-13). 확률을 적은 계획이 하나도 없으면 줄이 없다 — 폼에 확률 칸이 없어(2026-09-27 결정)
 * 대부분 비어 있는 게 정상이다. 성적 4요소(기간 · 표본 · 기준 대비 · 빗나간 사례)가 이 줄에 다 있다(FR-33)
 */
export const brierMirrorItem = (brier: BrierView, key = "brier"): ReactNode => {
  const { meanScore } = brier;
  if (meanScore.sampleSize === 0 && brier.pendingCount === 0) return null;
  const misses = brier.recentMisses.flatMap((miss) => {
    const from = formatShortDate(miss.plannedAt);
    const to = formatShortDate(miss.dueAt);
    return from && to ? [M.brier.miss(miss.symbol, formatRatio(miss.probabilityUp), from, to, miss.up)] : [];
  });
  return (
    <MirrorItem
      key={key}
      label={M.brier.label}
      sampleSize={meanScore.sampleSize}
      status={meanScore.status}
      text={
        meanScore.value !== null && brier.baseline !== null
          ? M.brier.line(formatScore(meanScore.value), formatScore(brier.baseline))
          : null
      }
      sub={[M.brier.counts(brier.missedCount, brier.pendingCount), ...misses]}
    />
  );
};

/** 표본 상태 — 표본 기준은 서버가 준 `minSample` 이다 */
const sampleStatus = (count: number, minSample: number): MirrorStatus =>
  count === 0 ? "insufficient_data" : count < minSample ? "insufficient_sample" : "ok";

/**
 * 연승 · 연패(FR-20). "연승 뒤 매수 금액이 커졌다"는 서버가 관찰됐다고 할 때만 쓴다 — 표본이 모자란 비율은 말하지 않는다.
 * 청산이 없으면 줄이 없다
 */
const streakMirrorItem = (streak: StreakView, minSample: number): ReactNode => {
  if (streak.sampleSize === 0) return null;
  const { current } = streak;
  const patterns = [
    streak.afterWins?.observed && streak.afterWins.ratio.value !== null
      ? M.streak.afterWins(streak.minLength, formatTimes(streak.afterWins.ratio.value), streak.afterWins.ratio.sampleSize)
      : null,
    streak.afterLosses?.observed && streak.afterLosses.ratio.value !== null
      ? M.streak.afterLosses(
          streak.minLength,
          formatTimes(streak.afterLosses.ratio.value),
          streak.afterLosses.ratio.sampleSize,
        )
      : null,
  ];
  return (
    <MirrorItem
      key="streak"
      label={M.streak.label}
      sampleSize={streak.sampleSize}
      status={sampleStatus(streak.sampleSize, minSample)}
      text={
        current === null
          ? M.streak.none
          : current.kind === "win"
            ? M.streak.currentWin(current.length)
            : M.streak.currentLoss(current.length)
      }
      sub={[
        M.streak.longest(streak.longestWin, streak.longestLoss),
        ...patterns,
        patterns.some(Boolean) ? M.streak.basis : null,
      ]}
    />
  );
};

const TimingRows = <K extends string>({
  buckets,
  names,
}: {
  buckets: ReadonlyArray<TimingBucketView<K>>;
  names: Record<K, string>;
}) => (
  <ul className={tagCostList}>
    {buckets
      .filter((bucket) => bucket.count > 0)
      .map((bucket) => (
        <li key={bucket.key} className={tagCostRow}>
          <span className={bucket.status === "ok" ? mirrorText : mirrorTextMuted}>
            {M.timing.row(
              names[bucket.key],
              bucket.count,
              bucket.winRate !== null ? formatRatio(bucket.winRate) : M.timing.missing,
              bucket.avgReturn !== null ? formatSignedRate(bucket.avgReturn) : M.timing.missing,
              formatSignedKrw(bucket.netPnlKrw),
            )}
          </span>
          {bucket.status === "insufficient_sample" && (
            <Badge size="sm" tone="warning">
              {M.insufficientSample}
            </Badge>
          )}
        </li>
      ))}
  </ul>
);

/**
 * 진입 시간대 · 요일(FR-22). 시각을 적은 진입이 없으면 시간대 목록이 없고, 날짜만 적은 건수를 한 줄로 밝힌다.
 * 청산이 없으면 줄이 없다
 */
/**
 * 손실 비대칭(F010 슬라이스 3 · `FE-REQ-040` FR-4) — 최근 청산 중 가장 큰 손실 ÷ 가장 큰 이익. 측정만 한다: 좋다 · 나쁘다는
 * 문장이 없고 "1 보다 크면" 뜻풀이 한 줄뿐이다. 한쪽이 없으면 값 대신 "둘 다 있어야 계산해요"
 */
const lossAsymmetryMirrorItem = (asymmetry: LossAsymmetryView): ReactNode => {
  const { ratio, maxLossKrw, maxGainKrw, window } = asymmetry;
  const ready = ratio.value !== null && maxLossKrw !== null && maxGainKrw !== null;
  return (
    <MirrorItem
      key="lossAsymmetry"
      label={M.lossAsymmetry.label}
      sampleSize={ratio.sampleSize}
      status={ready ? ratio.status : "insufficient_data"}
      text={ready ? M.lossAsymmetry.line(formatTimes(ratio.value ?? 0)) : null}
      sub={[
        ready ? M.lossAsymmetry.amounts(window, formatSignedKrw(maxLossKrw ?? 0), formatSignedKrw(maxGainKrw ?? 0)) : null,
        ready ? M.lossAsymmetry.hint : null,
      ]}
      extra={ready ? undefined : <p className={mirrorSub}>{M.lossAsymmetry.oneSided(window)}</p>}
    />
  );
};

const timingMirrorItem = (timing: TradeTimingView): ReactNode => {
  const total = timing.weekdays.reduce((sum, bucket) => sum + bucket.count, 0);
  if (total === 0) return null;
  return (
    <MirrorItem
      key="timing"
      label={M.timing.label}
      sampleSize={total}
      // 줄마다 자기 표본 배지가 있다 — 머리 배지는 합계만
      status="ok"
      extra={
        <>
          {timing.bands && <TimingRows buckets={timing.bands} names={M.timing.bands} />}
          <TimingRows buckets={timing.weekdays} names={M.timing.weekdays} />
          {timing.untimedCount > 0 && <p className={mirrorSub}>{M.timing.untimed(timing.untimedCount)}</p>}
        </>
      }
    />
  );
};

interface MirrorLinesProps {
  view: BehaviorMirrorView;
  /** 최근 행동(과매매 · 패닉 · 추격, FR-21). 리포트가 못 왔으면 `null` — 그 줄만 빠진다 */
  behaviorFacts: readonly ReportBehaviorFact[] | null;
}

/**
 * 내 거래 미러 (F009 시나리오 4 · FR-12 · FR-15~19 · FR-21 · `FE-REQ-039`). **표시만 한다** — 숫자는 서버가 셌다.
 *
 * - 줄마다 표본 수 배지. 20건 미만은 "표본 부족" 배지 + 굵기를 낮춘다(값은 보인다). 재료가 없으면 "기록이 모자라"
 * - 순서는 시나리오 4 그대로: 처분효과 → 보유 대비 → 계획 지킴 → 태그 손익 · 엣지 → 회전율, 그리고 최근 행동.
 *   연승 · 연패와 진입 시간대(슬라이스 7)는 태그 손익과 회전율 사이
 * - 지시 · 평가 문구가 없다(`MIRROR_MESSAGES` 머리말)
 */
export const MirrorLines = ({ view, behaviorFacts }: MirrorLinesProps) => {
  const { disposition, benchmark, adherence, turnover } = view;
  const items: ReactNode[] = [];

  if (disposition) {
    const holding = worse(disposition.gainHoldingDays, disposition.lossHoldingDays);
    const ratio = worse(disposition.pgr, disposition.plr);
    const holdingText =
      disposition.gainHoldingDays.value !== null && disposition.lossHoldingDays.value !== null
        ? M.disposition.holding(
            formatTimes(disposition.gainHoldingDays.value),
            formatTimes(disposition.lossHoldingDays.value),
          )
        : null;
    const ratioText =
      disposition.pgr.value !== null && disposition.plr.value !== null
        ? M.disposition.ratio(formatRatio(disposition.pgr.value), formatRatio(disposition.plr.value))
        : null;
    items.push(
      <MirrorItem
        key="disposition"
        label={M.disposition.label}
        sampleSize={disposition.pgr.sampleSize}
        sampleText={
          holdingText
            ? M.disposition.sample(disposition.gainHoldingDays.sampleSize, disposition.lossHoldingDays.sampleSize)
            : undefined
        }
        status={holdingText ? holding : ratio}
        text={holdingText ?? ratioText}
        sub={[holdingText ? ratioText : null]}
      />,
    );
  }

  if (benchmark) {
    const from = benchmark.from ? formatShortDate(benchmark.from) : null;
    const to = benchmark.to ? formatShortDate(benchmark.to) : null;
    items.push(
      <MirrorItem
        key="benchmark"
        label={M.benchmark.label}
        sampleSize={benchmark.sampleSize}
        status={benchmark.status}
        text={
          benchmark.holdReturn !== null && benchmark.actualReturn !== null
            ? M.benchmark.line(formatSignedRate(benchmark.holdReturn), formatSignedRate(benchmark.actualReturn))
            : null
        }
        sub={[
          benchmark.feeComponent !== null ? M.benchmark.fee(formatSignedRate(benchmark.feeComponent)) : null,
          from && to ? M.benchmark.period(from, to) : null,
        ]}
      />,
    );
  }

  if (adherence) {
    const total = Object.values(adherence.labelCounts).reduce((sum, count) => sum + count, 0);
    const returns = worse(adherence.honoredAvgReturn, adherence.violatedAvgReturn);
    items.push(
      <MirrorItem
        key="adherence"
        label={M.adherence.label}
        sampleSize={adherence.rate.sampleSize}
        status={adherence.rate.status}
        text={
          adherence.rate.value !== null
            ? M.adherence.line(total, adherence.labelCounts.honored, formatRatio(adherence.rate.value))
            : null
        }
        sub={[
          returns !== "insufficient_data" &&
          adherence.honoredAvgReturn.value !== null &&
          adherence.violatedAvgReturn.value !== null
            ? M.adherence.returns(
                formatSignedRate(adherence.honoredAvgReturn.value),
                formatSignedRate(adherence.violatedAvgReturn.value),
              )
            : null,
        ]}
      />,
    );
  }

  const brierItem = view.brier && brierMirrorItem(view.brier);
  if (brierItem) items.push(brierItem);

  if (view.tagCosts.length > 0) {
    const tagged = view.tagCosts.reduce((sum, cost) => sum + cost.count, 0);
    items.push(
      <MirrorItem
        key="tags"
        label={M.tags.label}
        sampleSize={tagged}
        // 줄마다 자기 표본 배지가 있다 — 머리 배지는 합계만
        status="ok"
        extra={<TagCostRows costs={view.tagCosts} />}
      />,
    );
  }

  const streakItem = view.streak && streakMirrorItem(view.streak, view.minSample);
  if (streakItem) items.push(streakItem);
  const timingItem = view.timing && timingMirrorItem(view.timing);
  if (timingItem) items.push(timingItem);
  if (view.lossAsymmetry) items.push(lossAsymmetryMirrorItem(view.lossAsymmetry));

  items.push(
    <MirrorItem
      key="turnover"
      label={M.turnover.label}
      sampleSize={turnover.tradeCount ?? 0}
      status={turnover.status === "ok" ? "ok" : "insufficient_data"}
      text={
        turnover.trailingYearTurnover !== null && turnover.feesYearToDateKrw !== null
          ? M.turnover.line(formatTimes(turnover.trailingYearTurnover), formatPrice(turnover.feesYearToDateKrw))
          : null
      }
      sub={[
        turnover.baseline
          ? M.turnover.baseline(
              turnover.baseline.source,
              turnover.baseline.period,
              formatFineRate(turnover.baseline.newRetailDailyTurnover),
            )
          : null,
      ]}
    />,
  );

  // 알림이던 3규칙(과매매 · 패닉 · 추격)이 여기 온다(FR-21). 리포트가 못 왔으면(`null`) 줄 자체가 없다
  const behaviorLines = (behaviorFacts ?? []).flatMap((fact, index) => {
    const text = describeBehaviorFact(fact);
    return text ? [{ key: `${fact.factCode}-${index}`, text }] : [];
  });

  return (
    <ul className={mirrorList}>
      {items}
      {behaviorFacts !== null && (
        <li className={mirrorItem}>
          <div className={mirrorHead}>
            <span className={mirrorLabel}>{M.behavior.label}</span>
          </div>
          {behaviorLines.length === 0 ? (
            <p className={mirrorTextMuted}>{M.behavior.none}</p>
          ) : (
            behaviorLines.map((line) => (
              <p key={line.key} className={mirrorText}>
                {line.text}
              </p>
            ))
          )}
        </li>
      )}
    </ul>
  );
};
