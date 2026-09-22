"use client";

// 클라이언트 잎: 상대 시각을 브라우저 시계로 그린다(`formatRelativeTime` — 서버에서 만들면 굳는다).
import { Skeleton } from "@repo/ui/skeleton";
import React from "react";

import { formatRelativeTime } from "@/shared/lib";

import { MARKET_SUMMARY_MESSAGES } from "../../model/messages";
import type { MarketBreadth, MarketSummaryHeadline } from "../../model/types";
import * as styles from "./MarketBriefingPanel.css";

interface MarketBriefingPanelProps {
  breadth: MarketBreadth | null;
  headlines: MarketSummaryHeadline[];
  /** 뉴스가 누구 것인지 — 대표 종목 이름 */
  featuredName: string | null;
}

/**
 * 오늘의 시장 — 상승 · 보합 · 하락 종목 수 + 막대 + 대표 종목 최근 뉴스 (`FE-REQ-037` FR-10). **표시 전용.**
 *
 * 수 · 뉴스 선택은 서버가 한다. 막대 칸 폭은 `flex-grow` 에 수를 그대로 넣는다(비율 계산 없음).
 * **해석 문구를 붙이지 않는다**("약세장 · 공포" 등) — 숫자만 말한다(공통 수용 기준 4).
 * 둘 다 없으면 상자를 그리지 않는다.
 */
export const MarketBriefingPanel = React.memo(
  ({ breadth, headlines, featuredName }: MarketBriefingPanelProps) => {
    const copy = MARKET_SUMMARY_MESSAGES.briefing;
    if (!breadth && headlines.length === 0) return null;

    const kinds = breadth
      ? [
          { key: "up", label: copy.up, count: breadth.up, text: styles.up, bar: styles.segmentUp },
          { key: "flat", label: copy.flat, count: breadth.flat, text: styles.flat, bar: styles.segmentFlat },
          { key: "down", label: copy.down, count: breadth.down, text: styles.down, bar: styles.segmentDown },
        ]
      : [];

    return (
      <section className={styles.panel} aria-label={copy.title}>
        <div className={styles.header}>
          <h3 className={styles.title}>{copy.title}</h3>
          <span className={styles.caption}>{copy.window}</span>
        </div>
        {breadth ? (
          <>
            <div className={styles.counts}>
              {kinds.map((kind) => (
                <span key={kind.key}>
                  <span className={styles.countLabel}>{kind.label}</span>
                  <span className={`${styles.countValue} ${kind.text}`}>{copy.count(kind.count)}</span>
                </span>
              ))}
            </div>
            <div
              className={styles.bar}
              role="img"
              aria-label={copy.barLabel(breadth.up, breadth.flat, breadth.down)}
            >
              {kinds.map((kind) =>
                kind.count > 0 ? (
                  <span key={kind.key} className={kind.bar} style={{ flexGrow: kind.count }} />
                ) : null,
              )}
            </div>
          </>
        ) : null}
        {headlines.length > 0 ? (
          <ul
            className={styles.list}
            aria-label={featuredName ? copy.newsLabel(featuredName) : undefined}
          >
            {headlines.map((headline) => (
              <li key={headline.id} className={styles.row}>
                <a
                  className={styles.link}
                  href={headline.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={copy.newsLinkTitle(headline.source)}
                >
                  {headline.title}
                </a>
                <span className={styles.time}>{formatRelativeTime(headline.publishedAt)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    );
  },
);
MarketBriefingPanel.displayName = "MarketBriefingPanel";

/** 같은 상자 · 같은 배치의 자리(FR-8) */
export const MarketBriefingPanelSkeleton = () => (
  <div className={styles.panel} aria-hidden="true">
    <Skeleton width={72} height={16} />
    <div className={styles.counts}>
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} width={40} height={30} />
      ))}
    </div>
    <div className={styles.list}>
      <Skeleton width="100%" height={14} lines={3} />
    </div>
  </div>
);
