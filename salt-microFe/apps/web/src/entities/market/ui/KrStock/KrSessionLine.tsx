import {
  isKrRegularSession,
  type KrProviderView,
  type KrSessionView,
  kstClock,
  kstDayDiff,
  kstMonthDay,
  kstWeekday,
} from "@repo/core/marketKr";

import { KR_STOCK_MESSAGES as M } from "../../model/krStockMessages";
import { sessionDot, sessionLine, sessionSep, sessionStrong } from "./krStock.css";

interface KrSessionLineProps {
  session: KrSessionView;
  provider?: KrProviderView;
  /** 이 연결의 실시간 구독이 거부됐다 — 정규장이어도 "실시간"이라 쓰지 않는다 */
  realtimeRefused?: boolean;
}

/** 마지막 체결 — 오늘이면 시각만, 아니면 날짜까지(어제 값을 오늘 값으로 읽지 않게, F011 회고 "장 전 저장값") */
const lastCloseText = (now: string, at: string) =>
  kstDayDiff(at, now) === 0 ? kstClock(at) : `${kstMonthDay(at)} ${kstClock(at)}`;

/**
 * 장 상태 줄(F011 FR-41) — 표 · 상세 머리. **값을 회색으로 만들지 않는다** — 폐장 뒤 값도 정상 값이고, 이 줄이 그 값이
 * 언제 것인지 말한다. 시각은 서버 `now` 기준 KST 로 쓴다(브라우저 시계 · 시간대와 무관).
 */
export const KrSessionLine = ({ session, provider, realtimeRefused = false }: KrSessionLineProps) => {
  const regular = isKrRegularSession(session.session);
  const live = regular && !realtimeRefused;
  const parts: string[] = [];

  if (!regular) {
    if (session.lastCloseAt) parts.push(M.session.lastClose(lastCloseText(session.now, session.lastCloseAt)));
    if (session.nextOpenAt) {
      const day = M.relativeDay(kstDayDiff(session.now, session.nextOpenAt), kstWeekday(session.nextOpenAt));
      parts.push(M.session.nextOpen(day, kstClock(session.nextOpenAt)));
    }
  }

  return (
    <p className={sessionLine}>
      {/* 점은 장식 — 상태는 글자가 말한다 */}
      <span className={live ? sessionDot.live : sessionDot.idle} aria-hidden="true">
        ●
      </span>
      <span className={sessionStrong}>
        {regular
          ? live
            ? M.session.live
            : M.session.liveRefused
          : `${M.session.notRegular} · ${M.sessionNames[session.session]}`}
      </span>
      {parts.map((part) => (
        <span key={part}>
          <span className={sessionSep} aria-hidden="true">
            ·{" "}
          </span>
          {part}
        </span>
      ))}
      {!session.calendarKnown && (
        <span title={M.session.calendarGuessTitle}>
          <span className={sessionSep} aria-hidden="true">
            ·{" "}
          </span>
          {M.session.calendarGuess}
        </span>
      )}
      {provider?.status === "degraded" && provider.since && (
        <span>
          <span className={sessionSep} aria-hidden="true">
            ·{" "}
          </span>
          {M.session.degraded(kstClock(provider.since))}
        </span>
      )}
    </p>
  );
};
