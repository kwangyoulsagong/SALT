import dynamic from "next/dynamic";
import {
  createSectionLoading,
  SectionBoundary,
} from "@/components/Section/SectionBoundary";
import Header from "@/components/Home/Header/Header";
import { Section } from "@repo/ui/section";
import { Padding } from "@repo/ui/padding";
import { Container } from "@repo/ui/container";
import { Root } from "@repo/ui/root";
import { Suspense } from "react";

// 실시간 테이블·차트는 브라우저 전용이라 SSR 에서 뺀다.
const Investment = dynamic(() => import("@/component/Investment/Investment"), {
  ssr: false,
  loading: createSectionLoading("투자 분석"),
});

const Investments = () => {
  return (
    <Root background="white">
      <Section containerSize="full" padding="sm">
        <Container size="2xl" padding="none">
          <Header />
          <Padding paddingX="xl">
            <SectionBoundary name="투자 분석">
              <Suspense fallback={createSectionLoading("투자 분석")()}>
                <Investment />
              </Suspense>
            </SectionBoundary>
          </Padding>
        </Container>
      </Section>
    </Root>
  );
};

export default Investments;
