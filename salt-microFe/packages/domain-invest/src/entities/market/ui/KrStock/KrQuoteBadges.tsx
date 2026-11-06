import {
  isKrRegularSession,
  type KrQuote,
  type KrSessionView,
  type KrStatusBadge,
  kstClockSeconds,
  krStaleMinutes,
} from "@repo/core/marketKr";
import { Badge } from "@repo/ui/badge";

import { KR_STOCK_MESSAGES as M } from "../../model/krStockMessages";
import { badges, visuallyHidden } from "./krStock.css";

interface KrQuoteBadgesProps {
  quote: Pick<KrQuote, "limitState" | "status" | "feed" | "priceUpdatedAt" | "vi" | "lastTradeAt">;
  /** 장 상태 — "N분 전"을 서버 `now` 로 센다(브라우저 시계 아님). "1분" 배지는 정규장에만(밤엔 1분 갱신이 없다) */
  session: KrSessionView;
  /** 시세 출처 배지(1분 · N분 전)를 그릴지 — 상세 머리는 시세 기준 줄이 따로 말한다 */
  showFeed?: boolean;
  /** 마지막 체결 칩을 그릴지 — 상세 머리는 정지 줄이 따로 말한다 */
  showLastTrade?: boolean;
}

/** 값이 멈추는 상태 — 경고 색(글자가 뜻을 말하고 색은 거든다) */
const WARNING_BADGES: ReadonlySet<KrStatusBadge> = new Set(["halted", "paused", "vi", "danger"]);

/**
 * 가격 옆 배지(F011 FR-43 · 44 · 45). 판정은 전부 서버 값이다 — 상하한 도달(`limitState`) · 종목 상태(`status`) ·
 * 시세 출처(`feed`). 화면은 글자로 옮긴다. 상 · 하는 방향 사실이라 상승 · 하락 색, 나머지는 중립 · 경고색.
 */
export const KrQuoteBadges = ({ quote, session, showFeed = true, showLastTrade = true }: KrQuoteBadgesProps) => {
  const now = session.now;
  const limit = quote.limitState ? M.limit[quote.limitState] : null;
  const feed =
    !showFeed || quote.feed === "realtime" || (quote.feed === "poll_1m" && !isKrRegularSession(session.session))
      ? null
      : quote.feed === "poll_1m"
        ? { text: M.feed.poll_1m.badge, title: M.feed.poll_1m.title, tone: "neutral" as const }
        : {
            text: M.feed.stale.badge(krStaleMinutes(quote.priceUpdatedAt, now)),
            title: M.feed.stale.title,
            tone: "warning" as const,
          };

  // 정지 · 단일가 중이면 서버가 마지막 체결 시각을 준다(F016 단계 A) — 그때는 "N분 전 시세"보다 이것이 사실이다
  const lastTrade = showLastTrade && quote.lastTradeAt ? M.lastTrade(kstClockSeconds(quote.lastTradeAt)) : null;
  const shownFeed = quote.lastTradeAt ? null : feed;

  if (!limit && quote.status.length === 0 && !shownFeed && !lastTrade) return null;

  return (
    <span className={badges}>
      {limit && (
        <Badge size="sm" tone={quote.limitState === "upper" ? "up" : "down"} title={limit.label}>
          <span aria-hidden="true">{limit.badge}</span>
          <span className={visuallyHidden}>{limit.label}</span>
        </Badge>
      )}
      {quote.status.map((status) =>
        status === "vi" ? (
          <Badge
            key={status}
            size="sm"
            tone="warning"
            title={M.vi.title(quote.vi?.triggeredAt ? kstClockSeconds(quote.vi.triggeredAt) : null)}
          >
            {M.vi.badge(quote.vi?.kind ? M.vi.kinds[quote.vi.kind] : null)}
          </Badge>
        ) : (
          <Badge key={status} size="sm" tone={WARNING_BADGES.has(status) ? "warning" : "neutral"}>
            {M.statusBadges[status]}
          </Badge>
        ),
      )}
      {lastTrade && (
        <Badge size="sm" tone="neutral">
          {lastTrade}
        </Badge>
      )}
      {shownFeed && (
        <Badge size="sm" tone={shownFeed.tone} title={shownFeed.title}>
          {shownFeed.text}
        </Badge>
      )}
    </span>
  );
};
