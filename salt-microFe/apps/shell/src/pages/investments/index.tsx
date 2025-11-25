import Header from "@/components/Home/Header/Header";
import { Section } from "@repo/ui/section";
import { Padding } from "@repo/ui/padding";
import React, { lazy, Suspense } from "react";
import { Container } from "@repo/ui/container";

const InvestmentPage = lazy(() => import("investments/Investment"));

const Investments = () => {
  return (
    <Section background="white" containerSize="full" padding="sm">
      <Container size="2xl" padding="none">
        <Header />
        <Suspense fallback={<div>로딩</div>}>
          <Padding paddingX="xl">
            <InvestmentPage />
          </Padding>
        </Suspense>
      </Container>
    </Section>
  );
};

export default Investments;
