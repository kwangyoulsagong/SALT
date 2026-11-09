"use client";

import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Margin } from "@repo/ui/margin";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";
import { Skeleton } from "@repo/ui/skeleton";
import { Text } from "@repo/ui/text";

import { formatRelativeTime } from "@repo/web-shared/lib";

import { useKrNews } from "../../api";
import { KR_STOCK_MESSAGES, MARKET_MESSAGES } from "../../model";
import { newsTitleLink } from "./MarketNewsPreview.css";
import { NewsBadge } from "./NewsBadge";

/** 코인 뉴스 프리뷰와 같은 카드 한 장 · 같은 높이(`MarketNewsPreview`) */
const CARD_HEIGHT = 58;

/**
 * 국내 종목 프리뷰 오늘 소식(F016 단계 C — 사용자 2026-11-09 "코인처럼 뉴스") — 코인 `MarketNewsPreview` 와 같은 모양: 제목 한 줄 ·
 * "제공처 · N분 전 · 공시/시황 배지". 다른 점은 원천(KIS 시황/공시 제목)에 **링크 · 요약 · 이미지가 없다**는 것뿐 — 제목을 링크처럼 그리지 않는다.
 * 비소유자(404) · 꺼짐이면 자리도 없다(국내 다른 블록과 같은 규칙)
 */
export const KrNewsPreview = ({ code }: { code: string }) => {
  const { data, isPending, isError } = useKrNews(code);
  if (isPending) return <Skeleton height={CARD_HEIGHT} />;
  if (isError || !data || data.status === "disabled") return null;
  const item = data.status === "ok" ? data.items[0] : undefined;
  if (!item) return <Text color="tertiary">{MARKET_MESSAGES.newsEmpty}</Text>;

  return (
    <Root>
      <Section noContainer padding="none">
        <span className={newsTitleLink} title={item.title}>
          <Heading level={4} lineClamp={1}>
            {item.title}
          </Heading>
        </span>
        <Margin top="sm">
          <FlexBox direction="row" gap="md" align="center">
            <Heading level={4} color="tertiary">
              {item.provider}
            </Heading>
            <Text color="tertiary">·</Text>
            <Text color="tertiary">{formatRelativeTime(item.publishedAt)}</Text>
            <Text color="tertiary">·</Text>
            <NewsBadge>{KR_STOCK_MESSAGES.news.kind[item.kind]}</NewsBadge>
          </FlexBox>
        </Margin>
      </Section>
    </Root>
  );
};
