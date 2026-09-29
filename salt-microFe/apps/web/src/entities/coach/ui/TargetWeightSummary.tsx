import type { TargetWeightView } from "@repo/core/coach";
import { Fragment } from "react";

import { formatShortDate, formatSignedRate } from "../lib";
import { TARGET_WEIGHT_MESSAGES } from "../model";
import { summarySegment } from "./TargetWeight.css";
import { formatDrawdown, formatMonth, formatWeight } from "./TargetWeightList";

const M = TARGET_WEIGHT_MESSAGES.summary;

interface TargetWeightSummaryProps {
  view: TargetWeightView;
  /** 두 줄의 글 모양 — 요약 띠가 넣는다 */
  valueClassName: string;
  noteClassName: string;
}

/**
 * 목표 비중 요약 두 줄 (F010 · `FE-REQ-042` FR-13) — 투자 화면 요약 띠의 한 칸.
 *
 * 1줄: 종목별 목표 비중 · 현금. 2줄: **3종 고지를 한 줄로** — 근거(변동성만으로 나눈 계산) · 과거 성적(연수익 · 최대 낙폭 ·
 * BTC 보유 낙폭) · 실패 사례(가장 크게 잃은 달 · 주). 비중만 떼어 보이면 고지 없는 숫자가 된다(마스터 인덱스 §6-1).
 * 과거 성적은 `recordSource` 를 따른다 — 라이브 30주 전에는 백테스트라고 밝힌다. 금액 · 부족 · 초과는 여기 없다(본문에만).
 * 조각마다 줄바꿈을 막는다 — "2018년 11월 / −16.0%" 처럼 실패 사례가 두 줄로 찢어지지 않게.
 */
export const TargetWeightSummary = ({ view, valueClassName, noteClassName }: TargetWeightSummaryProps) => {
  const weights = view.rows.map((row) => M.weight(row.symbol, formatWeight(row.targetWeight)));
  if (view.totals.cashTargetWeight !== null) weights.push(M.cash(formatWeight(view.totals.cashTargetWeight)));

  const live = view.recordSource === "live" ? view.live : null;
  const { record } = view;
  const segments: string[] = [M.basis];
  if (live && live.cumReturn !== null && live.mdd !== null && live.btcMdd !== null) {
    segments.push(M.live(live.nWeeks, formatSignedRate(live.cumReturn), formatDrawdown(live.mdd), formatDrawdown(live.btcMdd)));
    const week = live.worstWeeks[0];
    if (week) {
      const at = formatShortDate(week.rebalanceAt) ?? week.rebalanceAt.slice(0, 10);
      segments.push(M.worstWeek(at, formatSignedRate(week.strategy)));
    }
  } else {
    segments.push(
      M.backtest(formatSignedRate(record.strategy.cagr), formatDrawdown(record.strategy.mdd), formatDrawdown(record.holdBtc.mdd)),
    );
    const month = record.worstMonths[0];
    if (month) segments.push(M.worst(formatMonth(month.month), formatSignedRate(month.strategy)));
  }

  return (
    <>
      <span className={valueClassName}>{weights.join(" · ")}</span>
      <span className={noteClassName}>
        {segments.map((segment, i) => (
          <Fragment key={segment}>
            {i > 0 && " · "}
            <span className={summarySegment}>{segment}</span>
          </Fragment>
        ))}
      </span>
    </>
  );
};
