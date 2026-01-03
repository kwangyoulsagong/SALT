import useInvestments from "@/hooks/api/investments/useInvestments";
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Section } from "@repo/ui/section";
import React, { useEffect, useRef } from "react";
import {
  SentimentTemperatureProgressBarFrame,
  SentimentTemperatureProgressBarInProgress,
  SentimentTemperatureProgressBarWrapper,
  SentimentTemperatureText,
  SentimentText,
} from "./style/MarketIntelligencePreview.css";
import { Root } from "@repo/ui/root";

interface MarketIntelligencePreivewProps {
  symbol: string;
}
const MarketIntelligencePreview = React.memo(
  ({ symbol }: MarketIntelligencePreivewProps) => {
    const temperatureProgressRef = useRef<HTMLDivElement>(null);
    const { investmentMarketIntelligencePreview } = useInvestments();
    const { data } = investmentMarketIntelligencePreview(symbol);
    const sentimentData = {
      temperature: data.data.sentiment.sentimentScore,
      emoji: data.data.sentiment.interpretation.emoji,
      title: data.data.sentiment.interpretation.title,
    };

    useEffect(() => {
      if (!temperatureProgressRef.current || !sentimentData.temperature) return;
      requestAnimationFrame(() => {
        if (temperatureProgressRef.current) {
          temperatureProgressRef.current.style.transform = `scaleX(${
            sentimentData.temperature / 100
          })`;
        }
      });
    }, [sentimentData.temperature]);

    return (
      <Root width="full">
        <FlexBox direction="column" gap="4xl">
          <Section padding="none" noContainer>
            <FlexBox direction="column" gap="xl">
              <Heading level={5} color="tertiary">
                시장 심리 온도계
              </Heading>
              <FlexBox
                direction="row"
                justify="between"
                align="center"
                fullWidth
              >
                <FlexBox align="center" gap="sm">
                  <h2 className={SentimentText}>{sentimentData.emoji}</h2>
                  <h2 className={SentimentText}>{sentimentData.title}</h2>
                </FlexBox>
                <h2 className={SentimentTemperatureText}>
                  {sentimentData.temperature}°C
                </h2>
              </FlexBox>
              <div className={SentimentTemperatureProgressBarWrapper}>
                <div className={SentimentTemperatureProgressBarFrame} />
                <div
                  ref={temperatureProgressRef}
                  className={SentimentTemperatureProgressBarInProgress}
                />
              </div>
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
      </Root>
    );
  }
);
export default MarketIntelligencePreview;

MarketIntelligencePreview.displayName = "marketIntelligencePreview";
