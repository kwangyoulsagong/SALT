import { HOUSEHOLD_CATEGORY_LABEL, labelOf } from "@repo/core/labels";
import { ServiceIcon } from "@repo/ui/serviceicon";

import { ZoneLink } from "@repo/web-shared/ui/frame";
import { iconTile } from "@repo/web-shared/ui/surface.css";

import { HOME_DOMAIN_ICON } from "../model/domainIcon";
import { HOME_FEED_MESSAGES } from "../model/messages";
import type { HomeRecentItem, HomeUpcomingItem } from "../model/types";
import { amount, empty, list, main, panel, panelHead, panelTitle, row, rowSub, rowTitle } from "./HomeFeedView.css";

/** "2026-11-20" → "11월 20일" — 서버 날짜 문자열을 자르기만 한다(지금 시각을 읽지 않는다) */
const monthDay = (date: string): string => `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일`;
/** 다가오는 일은 해를 넘길 수 있다(목표 기한) — 해까지 */
const fullDate = (date: string): string => `${date.slice(0, 4)}년 ${monthDay(date)}`;

interface FeedRowProps {
  item: { domain: HomeRecentItem["domain"]; href: string; detail: string; date: string; amount: string | null };
  title: string;
  formatDate?: (date: string) => string;
}

const FeedRow = ({ item, title, formatDate = monthDay }: FeedRowProps) => (
  <li>
    <ZoneLink href={item.href} className={row}>
      {/* 아이콘 판 44(`FE-REQ-076` FR-3 — 휴대폰 목록 판과 같은 값) */}
      <span className={iconTile} aria-hidden>
        <ServiceIcon variant={HOME_DOMAIN_ICON[item.domain]} />
      </span>
      <span className={main}>
        <span className={rowTitle}>{title}</span>
        <span className={rowSub}>{HOME_FEED_MESSAGES.sub(item.detail, formatDate(item.date))}</span>
      </span>
      {item.amount ? <span className={amount}>{item.amount}</span> : null}
    </ZoneLink>
  </li>
);

/**
 * 최근 기록 — 지출 · 저축에 넣음 · 거래를 날짜 순으로(`FE-REQ-048` FR-13). **표시 전용** — 고르기 · 정렬 · 금액은 BFF.
 * 쓴 곳이 없는 지출은 분류 이름표(`@repo/core/labels`)로. `null` 은 원천을 못 받은 것 — 한 줄로 알린다
 */
export const HomeRecentList = ({ items }: { items: HomeRecentItem[] | null }) => (
  <section className={panel} aria-labelledby="home-recent-title">
    <div className={panelHead}>
      <h2 id="home-recent-title" className={panelTitle}>
        {HOME_FEED_MESSAGES.recentTitle}
      </h2>
    </div>
    {items === null ? (
      <p className={empty}>{HOME_FEED_MESSAGES.unavailable}</p>
    ) : items.length === 0 ? (
      <p className={empty}>{HOME_FEED_MESSAGES.recentEmpty}</p>
    ) : (
      <ul className={list}>
        {items.map((item, index) => (
          <FeedRow
            key={`${item.domain}-${item.date}-${index}`}
            item={item}
            title={item.title ?? labelOf(HOUSEHOLD_CATEGORY_LABEL, item.category ?? undefined) ?? HOME_FEED_MESSAGES.expenseFallback}
          />
        ))}
      </ul>
    )}
  </section>
);

/** 다가오는 일 — 매달 나가는 돈 예정 · 목표 기한(날짜 순, 고르기는 BFF) */
export const HomeUpcomingList = ({ items }: { items: HomeUpcomingItem[] | null }) => (
  <section className={panel} aria-labelledby="home-upcoming-title">
    <div className={panelHead}>
      <h2 id="home-upcoming-title" className={panelTitle}>
        {HOME_FEED_MESSAGES.upcomingTitle}
      </h2>
    </div>
    {items === null ? (
      <p className={empty}>{HOME_FEED_MESSAGES.unavailable}</p>
    ) : items.length === 0 ? (
      <p className={empty}>{HOME_FEED_MESSAGES.upcomingEmpty}</p>
    ) : (
      <ul className={list}>
        {items.map((item, index) => (
          <FeedRow key={`${item.domain}-${item.date}-${index}`} item={item} title={item.title} formatDate={fullDate} />
        ))}
      </ul>
    )}
  </section>
);
