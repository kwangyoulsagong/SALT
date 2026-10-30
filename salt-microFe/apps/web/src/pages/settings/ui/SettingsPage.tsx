import { Container } from "@repo/ui/container";
import { Heading } from "@repo/ui/heading";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";

import { BlockBoundary } from "@/shared/ui";

import { SETTINGS_PAGE } from "../model";
import { SettingsBody } from "./SettingsBody";

/**
 * 설정 (`/settings`) — 서버 컴포넌트 (F004 FR-12 · `FE-REQ-026` I). 헤더 프로필 메뉴 "설정"에서 들어온다.
 * 본문을 놓는 것까지만 한다(`fsd-pages.md`).
 */
export const SettingsPage = () => (
  <Root background="transparent">
    <Section containerSize="full" padding="sm">
      <Container size="2xl" padding="none">
        <Padding paddingX="xl">
          <Heading level={1} size="lg">
            {SETTINGS_PAGE.title}
          </Heading>
          <BlockBoundary name={SETTINGS_PAGE.blockName} minHeight={SETTINGS_PAGE.blockMinHeight}>
            <SettingsBody />
          </BlockBoundary>
        </Padding>
      </Container>
    </Section>
  </Root>
);

export default SettingsPage;
