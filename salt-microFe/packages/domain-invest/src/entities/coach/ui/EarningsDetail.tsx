"use client";

import type { EarningsOutlookView } from "@repo/core/coach";

import { EVENT_MESSAGES as M } from "../model";
import * as s from "./EventsCard.css";
import { ReactionDetail } from "./ReactionDetail";

const dayFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "UTC", month: "numeric", day: "numeric", weekday: "short" });
/** 서버가 준 서울 날짜(`YYYY-MM-DD`)를 그대로 — 시간대로 하루가 밀리지 않게 UTC 로 읽고 UTC 로 쓴다 */
export const formatDay = (ymd: string) => dayFormat.format(new Date(`${ymd}T00:00:00Z`));
/** 줄 안(좁다) — "1.23" (390 앱 웹뷰에서 이름 칸이 밀려 사라졌다, 2026-11-17 실화면) */
export const formatShortDay = (ymd: string) => `${Number(ymd.slice(5, 7))}.${Number(ymd.slice(8, 10))}`;

/**
 * 다음 실적 공시 펼침(F008 슬라이스 24 2단계 · `FE-REQ-046` FR-3) — 표시 전용. 회사가 알린 일정이면 반응만,
 * 예상 기간이면 3종(기준 표본 · 그 전 공시로만 잡은 기간의 적중 · 벗어난 결산) + 비교 기준(법정 기한) 뒤 반응.
 * 숫자 · 기간 · 기준은 전부 서버 값 — 여기서 계산하지 않는다
 */
export const EarningsDetail = ({ earnings }: { earnings: EarningsOutlookView }) => {
  const x = earnings.expected;
  return (
    <div className={s.detail}>
      {earnings.confirmed && (
        <p className={s.note}>{M.earnings.confirmed(M.earnings.confirmedSource[earnings.confirmed.source])}</p>
      )}
      {x && (
        <>
          <ul className={s.facts}>
            <li>{M.earnings.basis(x.sample)}</li>
            <li>{M.earnings.hitRate(x.hits, x.judged)}</li>
            <li>{M.earnings.deadline(formatDay(x.deadline))}</li>
          </ul>
          <h4 className={s.subHeading}>{M.earnings.missesHeading}</h4>
          {x.misses.length === 0 ? (
            <p className={s.note}>{M.earnings.noMisses(x.judged)}</p>
          ) : (
            <ul className={s.misses}>
              {x.misses.map((m) => (
                <li key={m.periodEnd}>
                  {M.earnings.miss(M.earnings.periodName(m.periodEnd), formatDay(m.actual), formatDay(m.from), formatDay(m.to))}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <p className={s.note}>{M.earnings.reactionNote}</p>
      <ReactionDetail
        horizons={earnings.horizons}
        labels={{ kind: M.earnings.reactionKind, row: M.earnings.reactionRow, pre: M.preReturn }}
      />
    </div>
  );
};
