"use client";

import { kstClock } from "@repo/core/marketKr";
import { StatusLine } from "@repo/ui/statusLine";

import {
  KR_STOCK_MESSAGES,
  krNewsToView,
  NEWS_MESSAGES,
  NewsModal,
  NewsRow,
  useKrNews,
  useNewsModal,
} from "@/entities/market";

import { caption, heading } from "./KrInvestorFlows.css";
import { newsList } from "./KrStockNews.css";
import { krSideCard } from "./SymbolHeader.css";

const M = KR_STOCK_MESSAGES.news;

/**
 * 국내 종목 오늘 소식(F016 단계 B · `FE-REQ-063` FR-4 · 행 · 모달 `FE-REQ-065`) — 그날 이 종목에 걸린 시황 · 공시 **제목**(최신이 앞, 광고성 제외는 서버).
 *
 * - 행은 프리뷰와 같은 한 벌(`NewsRow`) — 누르면 상세 모달(관련 종목 칩 · 이 종목 오늘 소식). 원문 링크 · 본문은 원천에 없다(`ADR-009`)
 * - "왜 움직였나" 해석 0 — 사실(시각 · 제공처 · 제목)만
 * - 404(소유자 아님) · 로그인 안 함 · 불러오는 중 · 꺼짐엔 자리도 없다(투자자 동향 카드와 같은 규칙)
 * - `collectedAt` — 빈 목록이 "소식 없음"인지 "수집이 늦음"인지 사람이 읽게 마지막 수집 시각을 둔다
 */
export const KrStockNews = ({ code }: { code: string }) => {
  const { data, isError } = useKrNews(code);
  const modal = useNewsModal();
  if (!data || isError || data.status === "disabled") return null;
  const views = data.status === "ok" ? data.items.map((n) => krNewsToView(n, M.kind[n.kind], data.code)) : [];
  const open = views.find((v) => v.id === modal.openId) ?? null;

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
          {views.length === 0 ? (
            <StatusLine kind="empty">{M.empty}</StatusLine>
          ) : (
            <div className={newsList}>
              {views.map((v) => (
                <NewsRow key={v.id} article={v} onOpen={(el) => modal.open(v.id, el)} />
              ))}
            </div>
          )}
          {data.collectedAt && <p className={caption}>{M.collectedAt(kstClock(data.collectedAt))}</p>}
          <NewsModal
            article={open}
            more={views.filter((v) => v.id !== open?.id).slice(0, 8)}
            moreTitle={NEWS_MESSAGES.moreKr}
            onSelect={modal.select}
            onClose={modal.close}
          />
        </>
      )}
    </section>
  );
};
