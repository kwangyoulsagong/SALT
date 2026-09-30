"use client";

import { useState } from "react";

import type {
  FundingPositioning,
  KimchiPositioning,
  SymbolPositioningResult,
} from "@repo/core/coach";

import { POSITIONING_MESSAGES as M } from "../model";
import { StatusLine } from "@repo/ui/statusLine";
import * as e from "./EventsCard.css";
import * as s from "./PositioningCard.css";
import { ReactionDetail } from "./ReactionDetail";

const KST = "Asia/Seoul";
const MINUS = "−";
const monthDay = new Intl.DateTimeFormat("en-US", {
  timeZone: KST,
  month: "numeric",
  day: "numeric",
});
const md = (iso: string) => monthDay.format(new Date(iso));
const compact = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumSignificantDigits: 3,
});
const won = new Intl.NumberFormat("ko-KR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 부호 있는 퍼센트. 자릿수만 다르다 — 펀딩비는 0.01% 단위라 4자리, 김프 · 변화율은 2 · 1자리 */
const signed = (ratio: number, digits: number) => {
  const text = (Math.abs(ratio) * 100).toFixed(digits);
  if (Number(text) === 0) return `${text}%`;
  return `${ratio > 0 ? "+" : MINUS}${text}%`;
};
/** 1년 백분위를 가까운 끝에서 센다 — 0.95 → "상위 5%", 0.12 → "하위 12%" */
const rank = (p: number) =>
  p >= 0.5
    ? M.rankTop(`${Math.max(1, Math.round((1 - p) * 100))}%`)
    : M.rankBottom(`${Math.max(1, Math.round(p * 100))}%`);

const Funding = ({ f }: { f: FundingPositioning }) => (
  <div className={s.stat}>
    <div className={s.statHead}>
      <h3 className={s.statName}>{M.fundingTitle}</h3>
      <span className={s.statValue}>{M.fundingRate(signed(f.rate, 4))}</span>
    </div>
    <span className={f.state === "neutral" ? s.state : s.stateStrong}>
      {M.fundingState[f.state](rank(f.percentile1y))}
    </span>
    {f.openInterest && (
      <p className={s.sub}>
        {M.openInterest(
          `${compact.format(f.openInterest.usd)} 달러`,
          f.openInterest.change7d === null
            ? null
            : signed(f.openInterest.change7d, 1),
        )}
      </p>
    )}
    {M.fundingReading[f.state] && (
      <p className={s.reading}>{M.fundingReading[f.state]}</p>
    )}
  </div>
);

const Kimchi = ({ k }: { k: KimchiPositioning }) => {
  const sign = k.premium > 0 ? "premium" : k.premium < 0 ? "discount" : null;
  const pending =
    k.confirmedState !== null && sign !== null && sign !== k.confirmedState;
  const since = k.since ? md(k.since) : null;
  return (
    <div className={s.stat}>
      <div className={s.statHead}>
        <h3 className={s.statName}>{M.kimchiTitle}</h3>
        <span className={s.statValue}>{signed(k.premium, 2)}</span>
      </div>
      {k.confirmedState && (
        <span className={s.state}>
          {M.kimchiState[k.confirmedState](since)}
        </span>
      )}
      {pending && <p className={s.reading}>{M.kimchiPending}</p>}
      <p className={s.sub}>
        {M.kimchiFx(won.format(k.fxUsdKrw), md(k.fxObservedAt))}
      </p>
    </div>
  );
};

/**
 * 쏠림 신호 카드 — 표시 전용 (`fsd-entities.md`, F008 `FE-REQ-038` FR-14 · FEATURE-008 FR-32 · 53).
 *
 * 선물 펀딩비가 지난 1년 중 어디쯤인지와 김치 프리미엄, 그리고 **지금 이어진 신호**의 과거 반응 분포(주요 사건과
 * 같은 모양 · 같은 게이트)를 보인다. "과열" 판정은 하지 않는다. 숫자는 전부 서버 값 — 여기서 하는 계산은
 * 퍼센트 표기와 "상위 · 하위" 중 가까운 끝 고르기뿐이다.
 */
export const PositioningCard = ({
  result,
  className,
}: {
  result: SymbolPositioningResult;
  className?: string;
}) => {
  const [open, setOpen] = useState(0);

  if (result.status !== "ok") {
    return (
      <section className={className}>
        <StatusLine kind="error">{M.unavailable}</StatusLine>
      </section>
    );
  }
  const current = result.reactions.filter((r) => r.current);

  return (
    <section
      className={`${className ?? ""} ${e.section}`}
      aria-labelledby="positioning-heading"
    >
      <div className={e.head}>
        <h2 id="positioning-heading" className={e.title}>
          {M.heading}
        </h2>
        <span className={e.badge}>{M.badge}</span>
      </div>
      <p className={e.lead}>{M.lead}</p>

      {result.blockedReason ? (
        <p className={e.note}>
          {M.blocked[result.blockedReason] ?? M.unavailable}
        </p>
      ) : (
        <>
          <div className={s.stats}>
            {result.funding && <Funding f={result.funding} />}
            {result.kimchi && <Kimchi k={result.kimchi} />}
          </div>

          <div>
            <h3 className={e.subHeading}>{M.reactionsHeading}</h3>
            {current.length === 0 ? (
              <StatusLine kind="empty">{M.reactionsEmpty}</StatusLine>
            ) : (
              <ul className={e.list}>
                {current.map((r, i) => {
                  const expanded = i === open;
                  const id = `positioning-${r.kind}`;
                  return (
                    <li
                      key={r.kind}
                      className={e.item}
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <button
                        type="button"
                        className={s.reactionButton}
                        aria-expanded={expanded}
                        aria-controls={id}
                        onClick={() => setOpen(expanded ? -1 : i)}
                      >
                        <span className={s.reactionName}>{M.kind[r.kind]}</span>
                        <span
                          className={
                            expanded
                              ? `${e.chevron} ${e.chevronOpen}`
                              : e.chevron
                          }
                          aria-hidden="true"
                        >
                          ›
                        </span>
                      </button>
                      {expanded && (
                        <div id={id}>
                          <ReactionDetail
                            horizons={r.horizons}
                            labels={{
                              kind: M.kind[r.kind],
                              row: M.rowSignal,
                              pre: M.preReturn,
                            }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
      <p className={e.disclaimer}>{result.disclaimer}</p>
    </section>
  );
};
