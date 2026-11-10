"use client";

// 클라이언트 잎: 주소 쿼리로 모달을 연다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { isKrStockCode } from "@repo/core/marketKr";

import { useKrNews, useSymbolNews } from "../../api";
import { coinNewsToView, krNewsToView, type NewsArticleView } from "../../lib/newsArticle";
import { useNewsModal } from "../../lib/useNewsModal";
import { KR_STOCK_MESSAGES } from "../../model";
import { NEWS_MESSAGES, NEWS_PREVIEW_FETCH_LIMIT } from "../../model/newsMessages";
import { NewsModal } from "./NewsModal";

const Host = ({
  views,
  moreTitle,
  moreCount,
}: {
  views: NewsArticleView[];
  moreTitle: string;
  moreCount: number;
}) => {
  const modal = useNewsModal();
  const open = views.find((v) => v.id === modal.openId) ?? null;
  return (
    <NewsModal
      article={open}
      more={views.filter((v) => v.id !== open?.id).slice(0, moreCount)}
      moreTitle={moreTitle}
      onSelect={modal.select}
      onClose={modal.close}
    />
  );
};

/** 프리뷰와 같은 쿼리 키(같은 `limit`) — 캐시를 나눠 다시 받지 않는다 */
const CoinHost = ({ symbol }: { symbol: string }) => {
  const { data } = useSymbolNews(symbol, NEWS_PREVIEW_FETCH_LIMIT);
  const views = (data?.items ?? []).map((n) => coinNewsToView(n, symbol, symbol));
  return <Host views={views} moreTitle={NEWS_MESSAGES.moreCoin} moreCount={5} />;
};

const KrHost = ({ code }: { code: string }) => {
  const { data } = useKrNews(code);
  const views = data?.status === "ok" ? data.items.map((n) => krNewsToView(n, KR_STOCK_MESSAGES.news.kind[n.kind], data.code)) : [];
  return <Host views={views} moreTitle={NEWS_MESSAGES.moreKr} moreCount={8} />;
};

/**
 * 시세 화면 뉴스 모달 하나(`FE-REQ-065`) — **주소가 상태다**: `?news=<id>&newsOf=<종목>`. 모달은 프리뷰가 아니라 이것이 그린다.
 *
 * 프리뷰 종목은 마우스를 올린 행이라 새로고침하면 첫 행으로 돌아간다 — 프리뷰가 모달을 그리면 그 목록에 기사가 없어 열리지 않았다
 * (2026-11-09 미검증 행). 여기는 주소의 종목으로 같은 목록을 직접 받는다 — 선택 · 자산군 탭과 무관하게 열린다.
 * 국내는 6자리 코드(`isKrStockCode`), 아니면 코인. 비소유자의 국내 주소는 목록이 없어 열리지 않는다(소유자 전용 그대로)
 */
export const NewsModalHost = () => {
  const { openId, openOf } = useNewsModal();
  if (!openId || !openOf) return null;
  return isKrStockCode(openOf) ? <KrHost code={openOf} /> : <CoinHost symbol={openOf} />;
};
