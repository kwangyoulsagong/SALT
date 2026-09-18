"use client";

// 클라이언트 잎: React Query 로 조회한다.
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";
import { Header } from "@repo/ui/header";
import { Heading } from "@repo/ui/heading";
import { Padding } from "@repo/ui/padding";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { Text } from "@repo/ui/text";

import { formatPrice } from "@/shared/lib";

import { useInvestmentsPreview, usePortfolioSummary } from "../api";
import { buildAnalysisGraph } from "../lib";
import { PORTFOLIO_MESSAGES } from "../model/messages";
import { AnalysisGraph } from "./AnalysisGraph";
import { HoldingSummaryList } from "./HoldingSummaryList";

/** 표시 전용 (`fsd-entities.md`). */
export const InvestmentSummary = () => {
  const investmentsPreview = useInvestmentsPreview();
  const holdings = usePortfolioSummary();

  // `isLoading` 이 아니라 `isPending` 이다 — 재시도 대기 구간에서는 `isLoading` 이 false
  // 인데(`fetchStatus === "idle"`) 아직 `data` 가 없다. 그 틈에 렌더가 걸리면 죽는다.
  if (investmentsPreview.isPending)
    return <div className="loading">{PORTFOLIO_MESSAGES.loading}</div>;
  if (investmentsPreview.isError)
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
          {/*
            옆 블록(`지난주 대비` + 막대)과 **같은 방식으로 폭을 잡는다** —
            바깥 열 `FlexBox` 는 기존 4블록이 쓰는 것이라 건드리지 않는다
            (변경 금지 목록). 폭이 필요한 쪽이 `Container size="full"` 로 감싼다.
          */}
          <Container size="full" padding="none">
            <Padding paddingY="sm">
              <FlexBox direction="column" gap="md" fullWidth>
                <Heading level={2}>{PORTFOLIO_MESSAGES.stockHeading}</Heading>
                {/*
                이 아래가 **비어 있었다** (`FE-REQ-010` FR-5). 보유 요약은 BFF 가
                합쳐 주고 화면은 표시만 한다.

                로그인하지 않았거나 못 불러온 것은 **보유가 없는 것과 다르다** —
                셋을 같은 문구로 뭉뚱그리면 "자산이 없다"는 거짓이 된다.
              */}
                {holdings.isSignedOut ? (
                  <Text color="tertiary">
                    {PORTFOLIO_MESSAGES.holdingsSignInRequired}
                  </Text>
                ) : holdings.isPending ? (
                  <Text color="tertiary">{PORTFOLIO_MESSAGES.loading}</Text>
                ) : holdings.isError ? (
                  <Text color="tertiary">
                    {PORTFOLIO_MESSAGES.holdingsLoadFailed}
                  </Text>
                ) : (
                  <>
                    <HoldingSummaryList items={holdings.data.items} />
                    {holdings.data.items.length > 0 ? (
                      <FlexBox justify="between" align="center" fullWidth>
                        <Text color="tertiary">
                          {PORTFOLIO_MESSAGES.totalLabel}
                        </Text>
                        <Text variant="bodyLarge">
                          {PORTFOLIO_MESSAGES.amount(
                            formatPrice(holdings.data.totalKrw),
                          )}
                        </Text>
                      </FlexBox>
                    ) : null}
                  </>
                )}
              </FlexBox>
            </Padding>
          </Container>
        </FlexBox>
      </Padding>
    </Container>
  );
};

export default InvestmentSummary;
