import { isKrRegularSession, type KrQuote, type KrSessionView, krStaleMinutes } from "@repo/core/marketKr";
import { Badge } from "@repo/ui/badge";

import { KR_STOCK_MESSAGES as M } from "../../model/krStockMessages";
import { badges, visuallyHidden } from "./krStock.css";

interface KrQuoteBadgesProps {
  quote: Pick<KrQuote, "limitState" | "status" | "feed" | "priceUpdatedAt">;
  /** 장 상태 — "N분 전"을 서버 `now` 로 센다(브라우저 시계 아님). "1분" 배지는 정규장에만(밤엔 1분 갱신이 없다) */
  session: KrSessionView;
  /** 시세 출처 배지(1분 · N분 전)를 그릴지 — 상세 머리는 시세 기준 줄이 따로 말한다 */
  showFeed?: boolean;
}

/**
 * 가격 옆 배지(F011 FR-43 · 44 · 45). 판정은 전부 서버 값이다 — 상하한 도달(`limitState`) · 종목 상태(`status`) ·
 * 시세 출처(`feed`). 화면은 글자로 옮긴다. 상 · 하는 방향 사실이라 상승 · 하락 색, 나머지는 중립 · 경고색.
 */
export const KrQuoteBadges = ({ quote, session, showFeed = true }: KrQuoteBadgesProps) => {
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

  if (!limit && quote.status.length === 0 && !feed) return null;

  return (
    <span className={badges}>
      {limit && (
        <Badge size="sm" tone={quote.limitState === "upper" ? "up" : "down"} title={limit.label}>
          <span aria-hidden="true">{limit.badge}</span>
          <span className={visuallyHidden}>{limit.label}</span>
        </Badge>
      )}
      {quote.status.map((status) => (
        <Badge key={status} size="sm" tone={status === "halted" || status === "danger" ? "warning" : "neutral"}>
          {M.statusBadges[status]}
        </Badge>
      ))}
      {feed && (
        <Badge size="sm" tone={feed.tone} title={feed.title}>
          {feed.text}
        </Badge>
      )}
    </span>
  );
};
