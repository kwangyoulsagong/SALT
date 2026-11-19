import { Container } from "@repo/ui/container";
import { Heading } from "@repo/ui/heading";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";

import { BlockBoundary } from "@repo/web-shared/ui";

import { PLAN_PAGE_META } from "../model";
import { PlanBody } from "./PlanBody";

/**
 * 밴드 적립(`/plan`) — 서버 컴포넌트. 투자 zone 머리 메뉴 "적립"이 여기로 온다(F003 v2 순서 3).
 * 본문을 놓는 것까지만 한다(`fsd-pages.md`)
 */
export const PlanPage = () => (
  <Root background="transparent">
    <Section containerSize="full" padding="sm">
      <Container size="2xl" padding="none">
        <Padding paddingX="xl">
          <Heading level={1} size="lg">
            {PLAN_PAGE_META.title}
          </Heading>
          <BlockBoundary name={PLAN_PAGE_META.blockName} minHeight={PLAN_PAGE_META.blockMinHeight}>
            <PlanBody />
          </BlockBoundary>
        </Padding>
      </Container>
    </Section>
  </Root>
);
