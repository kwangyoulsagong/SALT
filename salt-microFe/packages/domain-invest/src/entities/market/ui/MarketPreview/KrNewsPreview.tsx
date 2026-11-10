"use client";

import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Skeleton } from "@repo/ui/skeleton";
import { Text } from "@repo/ui/text";

import { useKrNews } from "../../api";
import { krNewsToView } from "../../lib/newsArticle";
import { useNewsModal } from "../../lib/useNewsModal";
import { KR_STOCK_MESSAGES, MARKET_MESSAGES } from "../../model";
import { NewsRow } from "../News";

/** 요약 없는 행 높이(제목 20 + 틈 4 + 메타 16 + 위아래 8) */
const ROW_HEIGHT = 56;

/**
 * 국내 종목 프리뷰 오늘 소식(F016 단계 C · `FE-REQ-065`) — 코인 뉴스 프리뷰와 같은 행 한 벌. 원천(KIS 시황/공시 제목)에 요약 · 이미지 · 링크가 없어
 * 그 칸만 빠진다. 누르면 상세 모달(관련 종목 칩 · 이 종목 오늘 소식). 비소유자(404) · 꺼짐이면 자리도 없다.
 * 모달은 시세 화면 `NewsModalHost` 가 주소(`?news=&newsOf=<코드>`)로 그린다 — 새로고침에도 열린다(2026-11-10)
 */
export const KrNewsPreview = ({ code }: { code: string }) => {
  const { data, isPending, isError } = useKrNews(code);
  const modal = useNewsModal();
  // 자리가 없을 때(404 · 꺼짐)는 제목도 없다 — 제목만 남은 빈 블록을 그리지 않는다(2026-11-09 확인 단계)
  if (!isPending && (isError || !data || data.status === "disabled")) return null;
  const views = data?.status === "ok" ? data.items.map((n) => krNewsToView(n, KR_STOCK_MESSAGES.news.kind[n.kind], data.code)) : [];
  const first = views[0];

  return (
    <FlexBox direction="column" gap="xl">
      <Heading level={5} color="tertiary">
        {MARKET_MESSAGES.krNewsHeading}
      </Heading>
      {isPending ? (
        <Skeleton height={ROW_HEIGHT} />
      ) : first ? (
        <NewsRow article={first} onOpen={(el) => modal.open(first.id, el, code)} />
      ) : (
        <Text color="tertiary">{MARKET_MESSAGES.newsEmpty}</Text>
      )}
    </FlexBox>
  );
};
