import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Section } from "@repo/ui/section";

interface MarketIntelligencePreivewProps {
  symbol: string;
}
const MarketIntelligencePreview = ({
  symbol,
}: MarketIntelligencePreivewProps) => {
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
};
export default MarketIntelligencePreview;
