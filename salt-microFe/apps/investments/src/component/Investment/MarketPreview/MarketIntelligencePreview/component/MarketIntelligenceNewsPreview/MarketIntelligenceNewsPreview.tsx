import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Image } from "@repo/ui/image";
import { Margin } from "@repo/ui/margin";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";
import { Text } from "@repo/ui/text";
import React from "react";
import Badge from "./Badge/Badge";

const MarketIntelligenceNewsPreview = React.memo(
  ({ symbol }: { symbol: string }) => {
    return (
      <Root>
        <Section noContainer padding="none">
          <FlexBox direction="row" gap="md" align="center">
            <Image
              width={78}
              height={58}
              radius={5}
              src="https://cdn.sisajournal-e.com/news/photo/202601/418655_230288_3251.jpg"
              alt={`${symbol} 뉴스 이미지`}
            />
            <FlexBox direction="column" gap="xs" style={{ minWidth: 0 }}>
              <Heading level={4} lineClamp={1}>
                The $1.7B Bitcoin Bet on Rally Above $100K, But Not Reaching
                faskdljfaksjfaksdjkfjkladjflasdjflkdasjflkjaslkfjlkasjfslkafjlaskfjlaskdjflkdjlakjflkasdjklasjflkdasjfldksajklasjlkasjdlkjkldjfaskdljslakdjfalskj
              </Heading>
              <Text variant="bodyLarge" color="tertiary">
                The strategy bets on a measured rally into the year-end, rather
                than a record-breaking surge
              </Text>
            </FlexBox>
          </FlexBox>
          <Margin top="sm">
            <FlexBox direction="row" gap="md" align="center">
              <Heading level={4} color="tertiary">
                coindesk
              </Heading>
              <Text color="tertiary">·</Text>
              <Text color="tertiary">4시간전</Text>
              <Text color="tertiary">·</Text>
              <Text color="tertiary">조회 11.7천</Text>
              <Text color="tertiary">·</Text>
              <Badge>{symbol}</Badge>
            </FlexBox>
          </Margin>
        </Section>
      </Root>
    );
  },
);
MarketIntelligenceNewsPreview.displayName = "MarketIntelligenceNewsPreview";

export default MarketIntelligenceNewsPreview;
