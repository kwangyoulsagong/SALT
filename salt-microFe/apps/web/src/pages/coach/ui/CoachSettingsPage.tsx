import { Container } from "@repo/ui/container";
import { Heading } from "@repo/ui/heading";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";

import { BlockBoundary } from "@repo/web-shared/ui";

import { COACH_SETTINGS_PAGE } from "../model";
import { CoachSettingsBody } from "./CoachSettingsBody";

/**
 * 투자 코치 설정 (`/coach/settings`) — 서버 컴포넌트 (F004 FR-12 · `FE-REQ-026` I).
 *
 * 2026-10-30 에 셸 `/settings` 로 생겼다. 내용이 전부 투자(코치 기본 모드 · 매도 돌아보는 기간 · 매입가 숨김 · 내 기준)라
 * zone 이 도메인으로 갈리면서 투자 쪽으로 옮겼다(`FE-REQ-053`, 사용자 결정 2026-11-02). 셸 `/settings` 는 계정 설정
 * (알림 · 내 데이터 — `FE-REQ-055` FR-5 · 6) 자리로 남고 여기로 링크한다. 본문을 놓는 것까지만 한다(`fsd-pages.md`).
 */
export const CoachSettingsPage = () => (
  <Root background="transparent">
    <Section containerSize="full" padding="sm">
      <Container size="2xl" padding="none">
        <Padding paddingX="xl">
          <Heading level={1} size="lg">
            {COACH_SETTINGS_PAGE.title}
          </Heading>
          <BlockBoundary name={COACH_SETTINGS_PAGE.blockName} minHeight={COACH_SETTINGS_PAGE.blockMinHeight}>
            <CoachSettingsBody />
          </BlockBoundary>
        </Padding>
      </Container>
    </Section>
  </Root>
);
