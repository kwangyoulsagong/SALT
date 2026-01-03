import useInvestments from "@/hooks/api/investments/useInvestments";
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Section } from "@repo/ui/section";
import React from "react";

interface MarketIntelligencePreivewProps {
  symbol: string;
}
const MarketIntelligencePreview = React.memo(
  ({ symbol }: MarketIntelligencePreivewProps) => {
    const { investmentMarketIntelligencePreview } = useInvestments();
    const { data } = investmentMarketIntelligencePreview(symbol);
    console.log(data.data);
    return (
      <FlexBox direction="column" gap="4xl">
        <Section padding="none" noContainer>
          <FlexBox direction="column" gap="xl">
            <Heading level={5} color="tertiary">
              시장 심리 온도계
            </Heading>
            <div> hello</div>
          </FlexBox>
        </Section>
        <Section padding="none" noContainer>
          <FlexBox direction="column" gap="xl">
            <Heading level={5} color="tertiary">
              스마트 머니 추적
            </Heading>
          </FlexBox>
        </Section>
      </FlexBox>
    );
  }
);
export default MarketIntelligencePreview;
