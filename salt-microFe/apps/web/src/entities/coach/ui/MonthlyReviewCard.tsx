import type { MonthlyReviewBody } from "@repo/core/coach";
import type { ReactNode } from "react";

import { formatPrice } from "@/shared/lib";

import { formatRatio, formatSignedKrw, formatSignedRate, formatTimes, tagName } from "../lib";
import { MIRROR_MESSAGES, REVIEW_MESSAGES } from "../model";
import { brierMirrorItem, MirrorItem, TagCostRows, worse } from "./MirrorLines";
import { mirrorHead, mirrorItem, mirrorLabel, mirrorList, mirrorSub, mirrorText } from "./Mirror.css";

const M = MIRROR_MESSAGES;
const R = REVIEW_MESSAGES;

/**
 * 월간 복기 본문 (F009 FR-28 · `FE-REQ-039` FR-21). **표시만 한다** — 숫자 · "이번 달 한 가지" 문장은 서버가 월초에 만들었다.
 *
 * 순서: 이번 달 한 가지 → 그달 거래 → 비용이 가장 컸던 태그 → 내 기준을 넘은 날 → 계획 지킴 → 익절 · 손절 → 그냥 들고 있었으면 →
 * 회전율 → "오를 확률" 채점. 미러와 같은 줄 모양 · 같은 표본 배지를 쓴다 — 두 섹션이 같은 말을 다르게 하지 않게.
 */
export const MonthlyReviewCard = ({ review }: { review: MonthlyReviewBody }) => {
  const { activity, adherence, disposition, benchmark, turnover, ipsDeviation: ips } = review;
  const items: ReactNode[] = [];

  items.push(
    <li key="activity" className={mirrorItem}>
      <div className={mirrorHead}>
        <span className={mirrorLabel}>{R.activity.label}</span>
      </div>
      <p className={mirrorText}>{R.activity.line(activity.tradeCount, activity.buyCount, activity.sellCount)}</p>
      <p className={mirrorSub}>{R.activity.closed(activity.closedCount)}</p>
    </li>,
  );

  if (review.topMistake) {
    items.push(
      <MirrorItem
        key="top-mistake"
        label={R.topMistake.label}
        sampleSize={review.topMistake.count}
        status={review.topMistake.status}
        extra={<TagCostRows costs={review.tagCosts} />}
      />,
    );
  }

  const ipsLines = [
    ips.lossBudget.status === "ok" && ips.lossBudget.days !== null
      ? R.ips.loss(ips.lossBudget.days)
      : ips.lossBudget.status === "budget_not_set"
        ? R.ips.lossNotSet
        : R.ips.lossUnavailable,
    ips.concentration.days !== null && ips.concentration.limit !== null
      ? R.ips.concentration(ips.concentration.days, formatRatio(ips.concentration.limit))
      : null,
    R.ips.basis,
  ];
  items.push(
    <MirrorItem
      key="ips"
      label={R.ips.label}
      sampleSize={ips.observedDays}
      sampleText={R.observedDays(ips.observedDays)}
      // 일수는 표본이 아니라 관찰한 날이다 — "표본 부족"을 붙이지 않는다
      status={ips.days === null ? "insufficient_data" : "ok"}
      text={ips.days === null ? null : R.ips.line(ips.days, ips.observedDays)}
      sub={ipsLines}
    />,
  );

  const adherenceTotal = Object.values(adherence.labelCounts).reduce((sum, count) => sum + count, 0);
  if (adherenceTotal > 0) {
    items.push(
      <MirrorItem
        key="adherence"
        label={M.adherence.label}
        sampleSize={adherence.rate.sampleSize}
        status={adherence.rate.status}
        text={
          adherence.rate.value !== null
            ? M.adherence.line(adherenceTotal, adherence.labelCounts.honored, formatRatio(adherence.rate.value))
            : null
        }
        sub={[
          adherence.honoredAvgReturn.value !== null && adherence.violatedAvgReturn.value !== null
            ? M.adherence.returns(
                formatSignedRate(adherence.honoredAvgReturn.value),
                formatSignedRate(adherence.violatedAvgReturn.value),
              )
            : null,
        ]}
      />,
    );
  }

  if (activity.closedCount > 0) {
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
        sampleText={M.disposition.sample(disposition.gainHoldingDays.sampleSize, disposition.lossHoldingDays.sampleSize)}
        status={
          holdingText
            ? worse(disposition.gainHoldingDays, disposition.lossHoldingDays)
            : worse(disposition.pgr, disposition.plr)
        }
        text={holdingText ?? ratioText}
        sub={[holdingText ? ratioText : null]}
      />,
    );
  }

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
      sub={[benchmark.feeComponent !== null ? M.benchmark.fee(formatSignedRate(benchmark.feeComponent)) : null]}
    />,
  );

  items.push(
    <MirrorItem
      key="turnover"
      label={R.turnover.label}
      sampleSize={activity.tradeCount}
      status={turnover.status === "ok" ? "ok" : "insufficient_data"}
      text={
        turnover.value !== null && turnover.feesKrw !== null
          ? R.turnover.line(formatTimes(turnover.value), formatPrice(turnover.feesKrw))
          : null
      }
    />,
  );

  const brier = review.brier && brierMirrorItem(review.brier, "review-brier");
  if (brier) items.push(brier);

  return (
    <>
      {review.oneThing && (
        <div className={mirrorItem}>
          <div className={mirrorHead}>
            <span className={mirrorLabel}>{R.oneThing}</span>
          </div>
          <p className={mirrorText}>{review.oneThing}</p>
          {review.topMistake && (
            <p className={mirrorSub}>
              {R.topMistake.line(
                tagName(review.topMistake.tag),
                formatSignedKrw(review.topMistake.netPnlKrw),
                review.topMistake.count,
              )}
            </p>
          )}
        </div>
      )}
      <ul className={mirrorList}>{items}</ul>
    </>
  );
};
