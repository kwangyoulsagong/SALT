"use client";

// 클라이언트 잎: React Query 로 조회한다.
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";
import { Header } from "@repo/ui/header";
import { Heading } from "@repo/ui/heading";
import { Padding } from "@repo/ui/padding";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { Text } from "@repo/ui/text";

import { useInvestmentsPreview } from "../api";
import { buildAnalysisGraph } from "../lib";
import { PORTFOLIO_MESSAGES } from "../model/messages";
import { AnalysisGraph } from "./AnalysisGraph";

/** 표시 전용 (`fsd-entities.md`). */
export const InvestmentSummary = () => {
  const investmentsPreview = useInvestmentsPreview();

  if (investmentsPreview.isLoading)
    return <div className="loading">{PORTFOLIO_MESSAGES.loading}</div>;
  if (investmentsPreview.error)
    return (
      <div className="error">
        <p>{PORTFOLIO_MESSAGES.loadFailed}</p>
      </div>
    );

  const { difference, investments } = investmentsPreview.data;
  const graphs = buildAnalysisGraph(investments);

  return (
    <Container size="full">
      <Padding paddingY="md">
        <FlexBox direction="column" gap="md">
          <Header>
            <ServiceIcon variant="analysis" />
            <Heading level={2}>{PORTFOLIO_MESSAGES.heading}</Heading>
          </Header>
          <Container size="full" padding="none">
            <FlexBox justify="between" align="center">
              <FlexBox direction="column" justify="center">
                <Text color="muted">{PORTFOLIO_MESSAGES.lastWeekCaption}</Text>
                <Heading level={2}>
                  {PORTFOLIO_MESSAGES.differenceLabel(difference)}
                </Heading>
              </FlexBox>
              <AnalysisGraph data={graphs} />
            </FlexBox>
          </Container>
          <Padding paddingY="sm">
            <FlexBox direction="column">
              <Heading level={2}>{PORTFOLIO_MESSAGES.stockHeading}</Heading>
            </FlexBox>
          </Padding>
        </FlexBox>
      </Padding>
    </Container>
  );
};

export default InvestmentSummary;
