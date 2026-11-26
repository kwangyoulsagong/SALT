"use client";

import type { ExplanationDay, SymbolExplanation } from "@repo/core/coach";
import { kstClock } from "@repo/core/marketKr";
import { useState, type ReactNode } from "react";

import { ExplainBox, SCOREBOARD_MESSAGES, useExplanationHistory } from "@/entities/coach";

import { formatPercent, formatTradeDay } from "../lib/formatDay";
import { EXPLANATION_DAYS_MESSAGES as M } from "../model/messages";
import * as s from "./ExplanationDays.css";

interface ExplanationDaysProps {
  symbol: string;
  mode: "scalp" | "long_term";
  /** 오늘 해설(스트림 포함) — 위젯이 끼운다. 지난 날을 보는 동안은 그리지 않는다(오늘 스트림을 열지 않는다) */
  children: ReactNode;
}

/** `-1` = 오늘, `0..` = 지난 날(최신 먼저) */
const TODAY = -1;

/**
 * 해설 지난 날 보기(`FE-REQ-079`) — 해설 상자 위 `‹ 날짜 ›`.
 *
 * - 오늘에서 시작한다. 미래 쪽(다음)은 오늘에서 막힌다. 저장된 날만 건너뛴다 — 빈 날을 지어내지 않는다
 * - 지난 날은 **그날 원문 그대로** + "몇 시에 쓴 해설 · 그 뒤 소식은 담지 않음" + 그날 판정 · 그날 · 그 뒤 등락(서버 값)
 * - 빗나간 날도 똑같이 보인다(골라 보여 주기 0). 평가 문장은 두지 않는다 — 숫자만 나란히
 * - 기록을 못 읽으면 오늘 해설은 그대로, 이전 버튼만 막고 이유 한 줄
 */
export const ExplanationDays = ({ symbol, mode, children }: ExplanationDaysProps) => {
  const history = useExplanationHistory(symbol, mode);
  const [index, setIndex] = useState(TODAY);
  const days = history.data?.days ?? [];
  // 모드가 바뀌거나 목록이 줄면(다시 받음) 오늘로 — 없는 칸을 가리키지 않게
  const at = index >= days.length ? TODAY : index;
  const day = at === TODAY ? null : days[at]!;
  const olderDay = days[at + 1];
  const newerLabel = at === 0 ? M.today : at > 0 ? formatTradeDay(days[at - 1]!.tradeDay) : null;
  const label = day ? formatTradeDay(day.tradeDay) : M.today;

  const hint = history.isError ? M.failed : history.isSuccess && days.length === 0 ? M.empty : null;

  return (
    <div className={s.days}>
      <nav className={s.nav} aria-label={M.navLabel}>
        <button
          type="button"
          className={s.navButton}
          disabled={!olderDay}
          aria-label={olderDay ? M.prevAria(formatTradeDay(olderDay.tradeDay)) : M.prevNoneAria}
          onClick={() => setIndex(at + 1)}
        >
          ‹
        </button>
        <span className={s.dayLabel} aria-live="polite">
          {label}
        </span>
        <button
          type="button"
          className={s.navButton}
          disabled={at === TODAY}
          aria-label={at === 0 ? M.nextTodayAria : newerLabel ? M.nextAria(newerLabel) : M.nextTodayAria}
          onClick={() => setIndex(at - 1)}
        >
          ›
        </button>
        {hint && at === TODAY && <span className={s.hint}>{hint}</span>}
      </nav>
      {day ? <PastDay day={day} mode={mode} symbol={symbol} disclaimer={history.data?.disclaimer ?? ""} onToday={() => setIndex(TODAY)} /> : children}
    </div>
  );
};

interface PastDayProps {
  day: ExplanationDay;
  mode: "scalp" | "long_term";
  symbol: string;
  disclaimer: string;
  onToday: () => void;
}

const Rate = ({ rate, text }: { rate: number; text: (r: string) => string }) => (
  <li className={`${s.outcomeItem} ${rate > 0 ? s.up : rate < 0 ? s.down : ""}`}>{text(formatPercent(rate))}</li>
);

const PastDay = ({ day, mode, symbol, disclaimer, onToday }: PastDayProps) => {
  const label = formatTradeDay(day.tradeDay);
  const verdict = SCOREBOARD_MESSAGES.signalTypes[`${mode}.${day.action}`];
  // 그날 원문을 해설 상자 모양으로 — 저장본이라 AI 단 · 이전 표시 줄은 머리 한 줄이 대신한다
  const view: SymbolExplanation = {
    symbol,
    mode,
    tier: "latest",
    aiGenerated: true,
    provider: day.provider,
    generatedAt: day.generatedAt,
    sentences: day.sentences,
    disclaimer,
  };
  return (
    <>
      <p className={s.asOf}>{M.pastAsOf(label, kstClock(day.generatedAt))}</p>
      <ul className={s.outcome}>
        <li className={s.outcomeItem}>{verdict ? M.verdict(verdict) : M.verdictUnknown}</li>
        {day.dayChangeRate !== null && <Rate rate={day.dayChangeRate} text={M.dayChange} />}
        {day.changeSinceRate !== null && <Rate rate={day.changeSinceRate} text={M.since} />}
      </ul>
      {/* 날을 바꾸면 다시 마운트 — 보일 때 문장이 다시 차례로(FE-REQ-079 FR-6) */}
      <ExplainBox key={day.tradeDay} view={view} />
      <button type="button" className={s.backToToday} onClick={onToday}>
        {M.backToToday}
      </button>
    </>
  );
};
