"use client";

// 클라이언트 잎: 상대 시각을 브라우저 시계로 그린다(`formatRelativeTime` — 서버에서 만들면 굳는다).
import { EVENT_KIND_LABELS } from "@repo/core/coach";
import type { KrScheduleItem } from "@repo/core/marketKr";
import { Skeleton } from "@repo/ui/skeleton";
import React from "react";

import { formatRelativeTime } from "@/shared/lib";

import { formatKrScheduleDate } from "../../lib/krScheduleDate";
import { KR_STOCK_MESSAGES } from "../../model/krStockMessages";
import { MARKET_SUMMARY_MESSAGES } from "../../model/messages";
import { type MarketBreadth, type MarketSummaryHeadline, SummaryChangeBasis } from "../../model/types";
import * as styles from "./MarketBriefingPanel.css";

interface MarketBriefingPanelProps {
  breadth: MarketBreadth | null;
  headlines: MarketSummaryHeadline[];
  /** 뉴스가 누구 것인지 — 대표 종목 이름 */
  featuredName: string | null;
  /** 국내 — 소식 줄 자리의 다가오는 일정(서버가 고른 최대 3건). 0건이면 그 자리를 숨긴다(`FE-REQ-050` FR-4) */
  schedule?: KrScheduleItem[];
  /** 등락 기준 — 머리 설명("24시간" · "전일 대비")과 막대 설명이 갈린다 */
  changeBasis?: SummaryChangeBasis;
}

/**
 * 오늘의 시장 — 상승 · 보합 · 하락 종목 수 + 막대 + 대표 종목 최근 뉴스 (`FE-REQ-037` FR-10). **표시 전용.**
 * 국내 탭은 뉴스 자리에 다가오는 국내 일정(`FE-REQ-050` FR-4) — 국내 뉴스는 모으지 않아 소식 줄을 지어내지 않는다.
 *
 * 수 · 뉴스 선택은 서버가 한다. 막대 칸 폭은 `flex-grow` 에 수를 그대로 넣는다(비율 계산 없음).
 * **해석 문구를 붙이지 않는다**("약세장 · 공포" 등) — 숫자만 말한다(공통 수용 기준 4).
 * 둘 다 없으면 상자를 그리지 않는다.
 */
export const MarketBriefingPanel = React.memo(
  ({ breadth, headlines, featuredName, schedule = [], changeBasis = SummaryChangeBasis.Last24h }: MarketBriefingPanelProps) => {
    const copy = MARKET_SUMMARY_MESSAGES.briefing;
    if (!breadth && headlines.length === 0 && schedule.length === 0) return null;

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
          <span className={styles.caption}>{copy.window[changeBasis]}</span>
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
              aria-label={copy.barLabel[changeBasis](breadth.up, breadth.flat, breadth.down)}
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
        {schedule.length > 0 ? (
          <ul className={styles.list} aria-label={copy.scheduleLabel}>
            {schedule.map((item) => (
              <li key={`${item.kind}-${item.eventAt}`} className={styles.row}>
                <span className={styles.scheduleKind}>{EVENT_KIND_LABELS[item.kind]}</span>
                <span className={styles.time}>{formatKrScheduleDate(item.eventAt)}</span>
                {/* 남은 날은 서버가 KST 달력으로 센 값 그대로 — 다시 세지 않는다 */}
                <span className={styles.dday}>{KR_STOCK_MESSAGES.schedule.dday(item.daysUntil)}</span>
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
