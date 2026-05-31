import dynamic from "next/dynamic";
import {
  createRemoteLoading,
  RemoteBoundary,
} from "@/components/Remote/RemoteBoundary";
import Header from "@/components/Home/Header/Header";
import { Section } from "@repo/ui/section";
import { Padding } from "@repo/ui/padding";
import { Container } from "@repo/ui/container";
import { Root } from "@repo/ui/root";
import { Suspense } from "react";

const InvestmentPage = dynamic(() => import("investments/Investment"), {
  ssr: false,
  loading: createRemoteLoading("투자 분석"),
});

const Investments = () => {
  return (
    <Root background="white">
      <Section containerSize="full" padding="sm">
        <Container size="2xl" padding="none">
          <Header />
          <Padding paddingX="xl">
            <RemoteBoundary name="투자 분석">
              <Suspense fallback={createRemoteLoading("투자 분석")()}>
                <InvestmentPage />
              </Suspense>
            </RemoteBoundary>
          </Padding>
        </Container>
      </Section>
    </Root>
  );
};

export default Investments;
