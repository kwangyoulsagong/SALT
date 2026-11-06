"use client";

import { kstClock } from "@repo/core/marketKr";
import { Badge } from "@repo/ui/badge";
import { StatusLine } from "@repo/ui/statusLine";

import { KR_STOCK_MESSAGES, useKrNews } from "@/entities/market";

import { caption, heading } from "./KrInvestorFlows.css";
import { item, list, meta, titleText } from "./KrStockNews.css";
import { krSideCard } from "./SymbolHeader.css";

const M = KR_STOCK_MESSAGES.news;

/**
 * 국내 종목 오늘 소식(F016 단계 B · `FE-REQ-063` FR-4) — 그날 이 종목에 걸린 시황 · 공시 **제목**(최신이 앞, 광고성 제외는 서버).
 *
 * - 링크가 없다 — 원천(KIS)에 원문 주소가 없고 본문도 받지 않는다(`ADR-009` 저작권 선). 제목을 링크처럼 그리지 않는다
 * - "왜 움직였나" 해석 0 — 사실(시각 · 제공처 · 제목)만. 원인 연결은 단계 C 카드의 몫
 * - 404(소유자 아님) · 로그인 안 함 · 불러오는 중 · 꺼짐엔 자리도 없다(투자자 동향 카드와 같은 규칙)
 * - `collectedAt` — 빈 목록이 "소식 없음"인지 "수집이 늦음"인지 사람이 읽게 마지막 수집 시각을 둔다(판정 임계는 두지 않는다)
 */
export const KrStockNews = ({ code }: { code: string }) => {
  const { data, isError } = useKrNews(code);
  if (!data || isError || data.status === "disabled") return null;

  return (
    <section className={krSideCard} aria-labelledby="kr-stock-news-heading">
      <h2 id="kr-stock-news-heading" className={heading}>
        {M.heading}
      </h2>
      {data.status !== "ok" ? (
        <StatusLine kind="error">{M.unavailable}</StatusLine>
      ) : (
        <>
          <p className={caption}>{M.caption}</p>
          {data.items.length === 0 ? (
            <StatusLine kind="empty">{M.empty}</StatusLine>
          ) : (
            <ul className={list}>
              {data.items.map((n) => (
                <li key={n.id} className={item}>
                  <span className={meta}>
                    <time dateTime={n.publishedAt}>{kstClock(n.publishedAt)}</time>
                    {/* 제공처 이름이 칩과 같으면("공시") 한 번만 — "공시 · 공시"로 겹쳐 읽히지 않게 */}
                    {n.provider !== M.kind[n.kind] && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{n.provider}</span>
                      </>
                    )}
                    <Badge size="sm" tone={n.kind === "disclosure" ? "brand" : "neutral"}>
                      {M.kind[n.kind]}
                    </Badge>
                  </span>
                  <p className={titleText}>{n.title}</p>
                </li>
              ))}
            </ul>
          )}
          {data.collectedAt && <p className={caption}>{M.collectedAt(kstClock(data.collectedAt))}</p>}
        </>
      )}
    </section>
  );
};
