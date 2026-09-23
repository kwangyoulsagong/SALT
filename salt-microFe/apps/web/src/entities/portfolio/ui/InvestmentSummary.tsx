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

import { usePortfolioSummary } from "../api";
import { PORTFOLIO_MESSAGES } from "../model/messages";
import { HoldingSummaryList } from "./HoldingSummaryList";

/**
 * 홈 투자 블록 — 보유 요약 (`FE-REQ-010` FR-5). 표시 전용 (`fsd-entities.md`).
 *
 * 2026-09-23 — 위에 있던 "지난주 대비 N% 덜 썼어요" 막대를 지웠다. MSW 목이 지어낸 지출 숫자였고
 * 서버에 지출 데이터가 없다. 그 조회가 실패하면 **아래 실제 보유 목록까지** 가려지는 구조였다.
 */
export const InvestmentSummary = () => {
  const holdings = usePortfolioSummary();

  return (
    <Container size="full">
      <Padding paddingY="md">
        <FlexBox direction="column" gap="md">
          <Header>
            <ServiceIcon variant="analysis" />
            <Heading level={2}>{PORTFOLIO_MESSAGES.heading}</Heading>
          </Header>
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
