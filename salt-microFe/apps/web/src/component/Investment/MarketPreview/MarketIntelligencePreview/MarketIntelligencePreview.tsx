import useInvestments from "@/hooks/api/investments/useInvestments";
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Section } from "@repo/ui/section";
import React, { useEffect, useMemo, useRef } from "react";
import {
  CircularProgressBackground,
  CircularProgressCenterText,
  CircularProgressSvg,
  CircularProgressValue,
  CircularProgressWrapper,
  SentimentTemperatureProgressBarFrame,
  SentimentTemperatureProgressBarInProgress,
  SentimentTemperatureProgressBarWrapper,
  SentimentTemperatureText,
  SentimentText,
  SmartMoneyMessage,
} from "./style/MarketIntelligencePreview.css";
import { Root } from "@repo/ui/root";
import { vars } from "@/styles/tokens.css";
import { Text } from "@repo/ui/text";
import MarketIntelligenceNewsPreview from "./component/MarketIntelligenceNewsPreview/MarketIntelligenceNewsPreview";

interface MarketIntelligencePreviewProps {
  symbol: string;
}

const RADIUS = 48;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const VISIBLE_ARC = 0.79; // 286도 (전체의 79%)
const VISIBLE_CIRCUMFERENCE = CIRCUMFERENCE * VISIBLE_ARC;

const MarketIntelligencePreview = React.memo(
  ({ symbol }: MarketIntelligencePreviewProps) => {
    const temperatureProgressRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<SVGCircleElement>(null);

    const { investmentMarketIntelligencePreview } = useInvestments();
    const { data, isLoading, isError } =
      investmentMarketIntelligencePreview(symbol);

    const marketData = data?.data;

    const sentimentData = {
      temperature: marketData?.sentiment.sentimentScore ?? 0,
      emoji: marketData?.sentiment.interpretation.emoji ?? "",
      title: marketData?.sentiment.interpretation.title ?? "",
    };

    const smartMoneyData = {
      score: marketData?.smartMoney.smartMoneyIndex.score ?? 0,
      signal: marketData?.smartMoney.smartMoneyIndex.signal ?? "",
      signals: marketData?.smartMoney.signals ?? {
        largeBuys: 0,
        largeSells: 0,
        orderbookRatio: 0,
      },
      interpretation: marketData?.smartMoney.interpretation ?? {
        message: "",
      },
    };

    const smartMoneyText = useMemo(() => {
      const score = smartMoneyData.score;
      if (score === 0) return "0";
      return score > 0 ? `+${score}` : `${score}`;
    }, [smartMoneyData.score]);

    const smartMoneyPercent = useMemo(() => {
      const score = smartMoneyData.score;
      return ((score + 100) / 200) * 100;
    }, [smartMoneyData.score]);

    const progressColor = useMemo(() => {
      if (smartMoneyData.score > 0) {
        return `${vars.colors.extra.up}`;
      }
      if (smartMoneyData.score === 0) return `${vars.colors.text.primary}`;

      return `${vars.colors.extra.down}`;
    }, [smartMoneyData.score]);

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

    // 원형 프로그레스 애니메이션
    useEffect(() => {
      if (!progressRef.current) return;

      const percent = Math.min(100, Math.max(0, smartMoneyPercent));

      const visibleLength = VISIBLE_CIRCUMFERENCE;
      const filledLength = visibleLength * (percent / 100);
      const offset = visibleLength - filledLength;

      progressRef.current.style.strokeDasharray = `${visibleLength} ${CIRCUMFERENCE}`;
      progressRef.current.style.strokeDashoffset = `${visibleLength}`;
      progressRef.current.style.stroke = progressColor;

      requestAnimationFrame(() => {
        if (progressRef.current) {
          progressRef.current.style.strokeDashoffset = `${offset}`;
        }
      });
    }, [smartMoneyPercent, progressColor]);

    if (isLoading || isError || !marketData) {
      return null;
    }

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
              <FlexBox direction="row" align="center" gap="xl">
                <div className={CircularProgressWrapper}>
                  <svg className={CircularProgressSvg} viewBox="0 0 104 104">
                    <circle
                      className={CircularProgressBackground}
                      cx="52"
                      cy="52"
                      r={RADIUS}
                    />
                    <circle
                      ref={progressRef}
                      className={CircularProgressValue}
                      cx="52"
                      cy="52"
                      r={RADIUS}
                    />
                  </svg>
                  <div className={CircularProgressCenterText}>
                    {smartMoneyText}
                  </div>
                </div>
                <FlexBox direction="column" gap="xs">
                  <Heading level={3}>{smartMoneyData.signal}</Heading>
                  <p className={SmartMoneyMessage}>
                    {smartMoneyData.interpretation.message}
                  </p>
                </FlexBox>
                <FlexBox direction="column" gap="lg">
                  <FlexBox direction="row" gap="xl">
                    <FlexBox
                      direction="column"
                      gap="md"
                      justify="center"
                      align="center"
                    >
                      <Heading level={6} color="tertiary">
                        대량 매수
                      </Heading>
                      <Text variant="bodyLarge" color="up">
                        {smartMoneyData.signals.largeBuys}
                      </Text>
                    </FlexBox>
                    <FlexBox
                      direction="column"
                      gap="md"
                      justify="center"
                      align="center"
                    >
                      <Heading level={6} color="tertiary">
                        대량 매도
                      </Heading>
                      <Text variant="bodyLarge" color="down">
                        {smartMoneyData.signals.largeSells}
                      </Text>
                    </FlexBox>
                  </FlexBox>
                  <FlexBox
                    direction="column"
                    gap="md"
                    justify="center"
                    align="center"
                  >
                    <Heading level={6} color="tertiary">
                      호가창 매수/매도 비율
                    </Heading>
                    <Heading level={3} size="2xl">
                      {smartMoneyData.signals.orderbookRatio}
                    </Heading>
                  </FlexBox>
                </FlexBox>
              </FlexBox>
            </FlexBox>
          </Section>
          <Section padding="none" noContainer>
            <FlexBox direction="column" gap="xl">
              <Heading level={5} color="tertiary">
                뉴스
              </Heading>
              <MarketIntelligenceNewsPreview symbol={symbol} />
            </FlexBox>
          </Section>
        </FlexBox>
      </Root>
    );
  },
);

export default MarketIntelligencePreview;

MarketIntelligencePreview.displayName = "MarketIntelligencePreview";
