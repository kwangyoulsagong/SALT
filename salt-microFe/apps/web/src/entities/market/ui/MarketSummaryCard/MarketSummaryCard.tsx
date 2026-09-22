"use client";

// 클라이언트 잎: barrel 로 노출되므로 경계를 스스로 갖는다(`fsd-entities.md`).
import { Image } from "@repo/ui/image";
import { Skeleton } from "@repo/ui/skeleton";
import { Sparkline } from "@repo/ui/sparkline";
import Link from "next/link";
import React from "react";

import { formatKrwCompact, formatPrice, useElementWidth } from "@/shared/lib";

import { MARKET_SUMMARY_MESSAGES } from "../../model/messages";
import { type MarketSummaryItem, MarketSummaryTag } from "../../model/types";
import * as styles from "./MarketSummaryCard.css";

/** 대표 차트 — 참고 화면 실측 202×77. 폭은 재서 넘기고 이 값은 첫 측정 전 폭이다 */
const FEATURED_CHART_FALLBACK = { width: 216, height: 77 };
const COMPACT_CHART = { width: 56, height: 40 };
/** 이름 앞 로고 — 글자 높이에 맞춘다 */
const LOGO_SIZE = { featured: 18, compact: 16 };
/** 참고 화면의 선 두께 */
const STROKE_WIDTH = 1.6;

interface MarketSummaryProps {
  item: MarketSummaryItem;
  /** 스파크라인 구간(분) — 서버가 준다 */
  windowMinutes: number;
  /** 누르면 갈 곳. 경로는 부르는 쪽이 정한다 */
  href: string;
}

const trendOf = (points: number[]) => {
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined || first === last) {
    return MARKET_SUMMARY_MESSAGES.sparklineTrend.flat;
  }
  return last > first
    ? MARKET_SUMMARY_MESSAGES.sparklineTrend.up
    : MARKET_SUMMARY_MESSAGES.sparklineTrend.down;
};

const directionClass = (change: number) =>
  change > 0 ? styles.up : change < 0 ? styles.down : styles.flat;

const signOf = (value: number) => (value > 0 ? "+" : value < 0 ? "-" : "");

/** 이름 + 서버가 붙인 태그(코드 → 문구). 모르는 코드는 BFF 가 이미 버렸다 */
const NameRow = ({
  item,
  className,
  logoSize,
}: {
  item: MarketSummaryItem;
  className: string;
  logoSize: number;
}) => (
  <span className={`${styles.head} ${className}`}>
    {/* 이름이 바로 옆에 있어 로고는 장식이다 — 스크린리더가 이름을 두 번 읽지 않게 alt 를 비운다 */}
    <Image radius={9999} width={logoSize} height={logoSize} src={item.logoUrl} alt="" />
    <span className={styles.nameText}>{item.name}</span>
    {item.tags.map((tag) => {
      const copy = MARKET_SUMMARY_MESSAGES.tags[tag];
      return (
        <span key={tag} className={styles.tag} title={copy.title}>
          {copy.label}
        </span>
      );
    })}
  </span>
);

/**
 * 가격 · 등락 금액 · (변동률). **금액은 서버 값 그대로다** — 없으면 변동률만 부호와 함께 보인다
 * (가격 × 변동률로 역산하지 않는다, 공통 수용 기준 3). 색만으로 방향을 말하지 않는다 — 부호를 붙인다.
 */
const PriceRow = ({ item }: { item: MarketSummaryItem }) => {
  const rate = Math.abs(item.change24h).toFixed(2);
  return (
    <span className={styles.priceRow}>
      <span>{formatPrice(item.currentPrice)}</span>
      <span
        className={`${styles.change} ${directionClass(item.change24h)}`}
        title={MARKET_SUMMARY_MESSAGES.changeTitle}
      >
        {item.change24hAmount === null
          ? `${signOf(item.change24h)}${rate}%`
          : `${signOf(item.change24hAmount)}${formatPrice(Math.abs(item.change24hAmount))} (${rate}%)`}
      </span>
    </span>
  );
};

const Trend = ({
  item,
  windowMinutes,
  width,
  height,
}: {
  item: MarketSummaryItem;
  windowMinutes: number;
  width: number;
  height: number;
}) =>
  item.sparkline ? (
    <Sparkline
      points={item.sparkline}
      area
      baseline={item.sparkline[0]}
      width={width}
      height={height}
      strokeWidth={STROKE_WIDTH}
      label={MARKET_SUMMARY_MESSAGES.sparklineLabel(
        item.name,
        MARKET_SUMMARY_MESSAGES.windowLabel(windowMinutes),
        trendOf(item.sparkline),
      )}
    />
  ) : null;

/** 고가 · 저가 · 거래대금. 거래대금은 좁은 칸이라 단위로 줄여 표기한다(값은 서버 그대로) */
const Stats = ({ item }: { item: MarketSummaryItem }) => {
  const labels = MARKET_SUMMARY_MESSAGES.stats;
  const rows = [
    { key: "high", label: labels.high, value: formatPrice(item.high24h) },
    { key: "low", label: labels.low, value: formatPrice(item.low24h) },
    { key: "tradeValue", label: labels.tradeValue, value: formatKrwCompact(item.tradeValue24h) },
  ];
  return (
    <span className={styles.stats}>
      {rows.map((row) => (
        <span key={row.key}>
          <span className={styles.statLabel}>{row.label}</span>
          <span className={styles.statValue}>{row.value}</span>
        </span>
      ))}
    </span>
  );
};

/** 대표 종목 — 이름 · 가격 · 영역 차트 · 고가/저가/거래대금 (`FE-REQ-037` FR-3). **표시 전용.** */
export const MarketSummaryFeatured = React.memo(
  ({ item, windowMinutes, href }: MarketSummaryProps) => {
    const [chartRef, chartWidth] = useElementWidth<HTMLSpanElement>(
      FEATURED_CHART_FALLBACK.width,
    );
    return (
      <Link href={href} className={styles.featured}>
        <NameRow item={item} className={styles.featuredName} logoSize={LOGO_SIZE.featured} />
        <PriceRow item={item} />
        <span ref={chartRef} className={styles.featuredChart}>
          <Trend
            item={item}
            windowMinutes={windowMinutes}
            width={chartWidth}
            height={FEATURED_CHART_FALLBACK.height}
          />
        </span>
        <Stats item={item} />
      </Link>
    );
  },
);
MarketSummaryFeatured.displayName = "MarketSummaryFeatured";

/** 작은 항목 — 작은 영역 차트 + 이름 · 가격. 태그가 붙으면 옅게 칠한다. **표시 전용.** */
export const MarketSummaryItemLink = React.memo(
  ({ item, windowMinutes, href }: MarketSummaryProps) => {
    const tinted = item.tags.includes(MarketSummaryTag.WideMove);
    const tint = !tinted
      ? ""
      : item.change24h > 0
        ? styles.tintUp
        : item.change24h < 0
          ? styles.tintDown
          : "";
    return (
      <Link href={href} className={`${styles.compact} ${tint}`}>
        <span className={styles.compactChart}>
          <Trend
            item={item}
            windowMinutes={windowMinutes}
            width={COMPACT_CHART.width}
            height={COMPACT_CHART.height}
          />
        </span>
        <span className={styles.compactBody}>
          <NameRow item={item} className={styles.compactName} logoSize={LOGO_SIZE.compact} />
          <PriceRow item={item} />
        </span>
      </Link>
    );
  },
);
MarketSummaryItemLink.displayName = "MarketSummaryItemLink";

/**
 * 자리 — **실제 칸과 같은 배치 · 폭**이다(FR-8). 줄 높이(20 · 20 · 77 · 32)와 여백을 실제 칸 스타일에서
 * 그대로 빌려 채워질 때 아무것도 움직이지 않게 한다. 스크린리더에는 숨긴다.
 */
export const MarketSummaryFeaturedSkeleton = () => (
  <span className={styles.featured} aria-hidden="true">
    <span className={styles.skeletonLine}>
      <Skeleton width={96} height={14} />
    </span>
    <span className={styles.skeletonLine}>
      <Skeleton width={176} height={14} />
    </span>
    <span className={styles.featuredChart}>
      <Skeleton width="100%" height={FEATURED_CHART_FALLBACK.height} />
    </span>
    <span className={styles.stats}>
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} width={60} height={28} />
      ))}
    </span>
  </span>
);

export const MarketSummaryItemSkeleton = () => (
  <span className={styles.compact} aria-hidden="true">
    <span className={styles.compactChart}>
      <Skeleton width={COMPACT_CHART.width} height={COMPACT_CHART.height} />
    </span>
    <span className={styles.compactBody}>
      <span className={styles.skeletonLine}>
        <Skeleton width={72} height={12} />
      </span>
      <span className={styles.skeletonLine}>
        <Skeleton width={150} height={14} />
      </span>
    </span>
  </span>
);
