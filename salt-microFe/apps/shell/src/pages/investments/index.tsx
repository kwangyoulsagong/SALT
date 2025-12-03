import Header from "@/components/Home/Header/Header";
import { Section } from "@repo/ui/section";
import { Padding } from "@repo/ui/padding";
import { Container } from "@repo/ui/container";
import { Root } from "@repo/ui/root";
import React, { lazy, Suspense } from "react";

const InvestmentPage = lazy(() => import("investments/Investment"));

const Investments = () => {
  return (
    <Root background="white">
      <Section containerSize="full" padding="sm">
        <Container size="2xl" padding="none">
          <Header />
          <Suspense fallback={<div>로딩</div>}>
            <Padding paddingX="xl">
              <InvestmentPage />
            </Padding>
          </Suspense>
        </Container>
      </Section>
    </Root>
  );
};

export default Investments;
