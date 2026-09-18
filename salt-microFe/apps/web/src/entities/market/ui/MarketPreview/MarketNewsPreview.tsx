"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Image } from "@repo/ui/image";
import { Margin } from "@repo/ui/margin";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";
import { Skeleton } from "@repo/ui/skeleton";
import { Text } from "@repo/ui/text";
import React from "react";

import { formatRelativeTime } from "@/shared/lib";

import { useSymbolNews } from "../../api";
import { MARKET_MESSAGES } from "../../model";
import { newsSummary, newsTitleLink } from "./MarketNewsPreview.css";
import { NewsBadge } from "./NewsBadge";

/** 프리뷰 블록은 카드 한 장이다 — 구조와 크기를 바꾸지 않는다 (`FE-REQ-010` FR-45). */
const PREVIEW_LIMIT = 1;

/** 자리표시자 높이 = 실제 카드 높이. 도착할 때 블록이 밀리지 않게 한다. */
const CARD_HEIGHT = 58;

/**
 * 종목 뉴스 프리뷰.
 *
 * ## 여기 있던 것
 *
 * 제목·요약·이미지·출처·조회수가 **전부 상수**였고, 제목에는 테스트 문자열
 * (`faskdljfaksjf…`)이 그대로 박혀 있었다. 종목을 바꿔도 같은 기사가 나왔다.
 *
 * 이제 `/api/app/news` 의 실데이터다. **없으면 없다고 말한다** — 더미를 만들지 않는다
 * (FR-42). 이미지가 없으면 그 영역을 그리지 않는다. 플레이스홀더 이미지도 만들지
 * 않는다(FR-41) — 뉴스 소스 절반이 이미지를 주지 않는다.
 */
export const MarketNewsPreview = React.memo(
  ({ symbol }: { symbol: string }) => {
    const { data, isPending, isError } = useSymbolNews(symbol, PREVIEW_LIMIT);

    if (isPending) return <Skeleton height={CARD_HEIGHT} />;

    const article = data?.items[0];

    if (isError || !article) {
      return <Text color="tertiary">{MARKET_MESSAGES.newsEmpty}</Text>;
    }

    return (
      <Root>
        <Section noContainer padding="none">
          <FlexBox direction="row" gap="md" align="center">
            {article.imageUrl ? (
              <Image
                width={78}
                height={CARD_HEIGHT}
                radius={5}
                src={article.imageUrl}
                alt={MARKET_MESSAGES.newsImageAlt(symbol)}
              />
            ) : null}
            <FlexBox direction="column" gap="xs" style={{ minWidth: 0 }}>
              {/*
                제목이 원문으로 가는 유일한 길이다. 새 탭으로 열고 `noopener` 를 붙인다
                (FR-44) — 없으면 열린 문서가 `window.opener` 로 이 탭을 조작할 수 있다.
              */}
              <a
                className={newsTitleLink}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                title={article.title}
              >
                <Heading level={4} lineClamp={1}>
                  {article.title}
                </Heading>
              </a>
              {article.summary ? (
                <div className={newsSummary}>
                  <Text variant="bodyLarge" color="tertiary">
                    {article.summary}
                  </Text>
                </div>
              ) : null}
            </FlexBox>
          </FlexBox>
          <Margin top="sm">
            <FlexBox direction="row" gap="md" align="center">
              <Heading level={4} color="tertiary">
                {article.source}
              </Heading>
              <Text color="tertiary">·</Text>
              <Text color="tertiary">
                {formatRelativeTime(article.publishedAt)}
              </Text>
              {typeof article.viewCount === "number" ? (
                <>
                  <Text color="tertiary">·</Text>
                  <Text color="tertiary">
                    {MARKET_MESSAGES.newsViews(article.viewCount)}
                  </Text>
                </>
              ) : null}
              <Text color="tertiary">·</Text>
              <NewsBadge>{symbol}</NewsBadge>
            </FlexBox>
          </Margin>
        </Section>
      </Root>
    );
  },
);
MarketNewsPreview.displayName = "MarketNewsPreview";

export default MarketNewsPreview;
