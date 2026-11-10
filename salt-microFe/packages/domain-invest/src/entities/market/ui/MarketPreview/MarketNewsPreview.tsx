"use client";

// 클라이언트 잎: 상태 · 주소 쿼리를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { Skeleton } from "@repo/ui/skeleton";
import { Text } from "@repo/ui/text";

import { useSymbolNews } from "../../api";
import { coinNewsToView } from "../../lib/newsArticle";
import { useNewsModal } from "../../lib/useNewsModal";
import { MARKET_MESSAGES } from "../../model";
import { NEWS_PREVIEW_FETCH_LIMIT } from "../../model/newsMessages";
import { NewsRow } from "../News";

/** 자리표시자 높이 = 요약 있는 행 높이(실측 100). 도착할 때 블록이 밀리지 않게 */
const ROW_HEIGHT = 100;

/**
 * 코인 종목 뉴스 프리뷰(`FE-REQ-010` · `FE-REQ-065`) — 행 한 줄(제목 · 요약 두 줄 · `출처 ・ N분 전` · 썸네일). 누르면 상세 모달
 * (요약 · 원문 보기 새 탭 · 주요 뉴스). 본문은 모달이 열 때 따로 받는다(`FE-REQ-068` — RSS `content` 조각은 싣지 않는다). 없으면 없다고 말한다(더미 0).
 * 모달은 여기서 그리지 않는다 — 시세 화면 `NewsModalHost` 가 주소(`?news=&newsOf=`)로 그린다(새로고침에도 열리게, 2026-11-10).
 * 프리뷰는 한 줄이고 모달 아래 "주요 뉴스"용으로 몇 건 더 받는다(같은 쿼리 키 — `NEWS_PREVIEW_FETCH_LIMIT`)
 */
export const MarketNewsPreview = ({ symbol }: { symbol: string }) => {
  const { data, isPending, isError } = useSymbolNews(symbol, NEWS_PREVIEW_FETCH_LIMIT);
  const modal = useNewsModal();
  if (isPending) return <Skeleton height={ROW_HEIGHT} />;
  const views = (data?.items ?? []).map((n) => coinNewsToView(n, symbol, symbol));
  const first = views[0];
  if (isError || !first) return <Text color="tertiary">{MARKET_MESSAGES.newsEmpty}</Text>;

  return <NewsRow article={first} onOpen={(el) => modal.open(first.id, el, symbol)} />;
};

export default MarketNewsPreview;
