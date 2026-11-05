import { Container } from "@repo/ui/container";
import { Heading } from "@repo/ui/heading";
import { Padding } from "@repo/ui/padding";
import { Root } from "@repo/ui/root";
import { Section } from "@repo/ui/section";

import { ROUTES } from "@repo/web-shared/config";
import { NavChevron, ZoneLink } from "@repo/web-shared/ui";
import { panel, panelDescription, panelHead, panelTitle } from "@repo/web-shared/ui/surface.css";

import { AlertPrefsPanel } from "@/features/toggle-alerts";

import { SETTINGS_PAGE } from "../model";
import { navRow, stack } from "./SettingsPage.css";

/**
 * 설정 (`/settings`) — 셸 · 서버 컴포넌트. 헤더 프로필 메뉴 "설정"에서 들어온다.
 *
 * **셸은 도메인 화면을 품지 않는다**(`ADR-005` §2). 2026-10-30 에 생긴 내용(코치 기본 모드 · 매입가 숨김 · 내 기준)은
 * 전부 투자라 투자 zone `/coach/settings` 로 옮겼고(`FE-REQ-053`, 사용자 결정 2026-11-02), 여기는 도메인별 설정으로
 * 가는 목록이다. 계정 설정은 이 화면에 패널로 붙는다 — 알림(`FE-REQ-055` FR-6, 서버 S2c 2026-11-06) · 내 데이터(FR-5, S3).
 */
export const SettingsPage = () => (
  <Root background="transparent">
    <Section containerSize="full" padding="sm">
      <Container size="2xl" padding="none">
        <Padding paddingX="xl">
          <Heading level={1} size="lg">
            {SETTINGS_PAGE.title}
          </Heading>
          <div className={stack}>
            {/* 패널째 기능이 그린다 — 로그아웃이면 패널이 없다(빈 제목만 남지 않게) */}
            <AlertPrefsPanel />
            <section className={panel}>
              <div className={panelHead}>
                <h2 className={panelTitle}>{SETTINGS_PAGE.investHeading}</h2>
              </div>
              <p className={panelDescription}>
                {SETTINGS_PAGE.investDescription}
              </p>
              <ZoneLink href={ROUTES.coachSettings} className={navRow}>
                <span>{SETTINGS_PAGE.investLink}</span>
                <NavChevron />
              </ZoneLink>
            </section>
          </div>
        </Padding>
      </Container>
    </Section>
  </Root>
);

export default SettingsPage;
