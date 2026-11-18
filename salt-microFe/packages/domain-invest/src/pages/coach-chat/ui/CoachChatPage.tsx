import { Container } from "@repo/ui/container";
import { Heading } from "@repo/ui/heading";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";

import { BlockBoundary } from "@repo/web-shared/ui";

import { COACH_CHAT_PAGE } from "../model";
import { CoachChatBody } from "./CoachChatBody";

/**
 * 코치 대화(`/coach/chat`) — 서버 컴포넌트(F006 C절 · `FE-REQ-030`). 투자 머리 메뉴 "코치 대화"에서 들어온다.
 * 본문을 놓는 것까지만 한다(`fsd-pages.md`).
 */
export const CoachChatPage = () => (
  <Root background="transparent">
    <Section containerSize="full" padding="sm">
      <Container size="2xl" padding="none">
        <Padding paddingX="xl">
          <Heading level={1} size="lg">
            {COACH_CHAT_PAGE.title}
          </Heading>
          <BlockBoundary name={COACH_CHAT_PAGE.blockName} minHeight={COACH_CHAT_PAGE.blockMinHeight}>
            <CoachChatBody />
          </BlockBoundary>
        </Padding>
      </Container>
    </Section>
  </Root>
);
