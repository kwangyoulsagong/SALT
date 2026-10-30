"use client";

import { StatusLine } from "@repo/ui/statusLine";
import { Text } from "@repo/ui/text";
import Link from "next/link";
import type { ReactNode } from "react";

import { CoachBlockSkeleton, useCoachProfile } from "@/entities/coach";
import { CoachProfileForm } from "@/features/edit-coach-profile";
import { PurchasePriceToggle } from "@/features/toggle-purchase-price";
import { COACH_REPORT_SECTIONS, ROUTES } from "@/shared/config";
import { NavChevron } from "@/shared/ui";
import { panel, panelDescription, panelHead, panelTitle } from "@/shared/ui/surface.css";

import { SETTINGS_PANEL_MESSAGES as M } from "../model";
import { layout, navRow } from "./SettingsPanel.css";

const Panel = ({ heading, description, children }: { heading: string; description?: string; children: ReactNode }) => (
  <section className={panel}>
    <div className={panelHead}>
      <h2 className={panelTitle}>{heading}</h2>
    </div>
    {description && <p className={panelDescription}>{description}</p>}
    {children}
  </section>
);

/**
 * 설정 화면 본문 (F004 FR-12 · `FE-REQ-026` FR-80~82). 헤더 프로필 메뉴 "설정"이 여기로 온다.
 *
 * 설정은 **바꾸면 무언가 달라지는 것만** 둔다(FR-80 개정 2026-10-30). 한 종목 상한 등 내 기준은 게이지와 나란히
 * 보는 코치 리포트에 이미 있어 옮기지 않고 링크한다 — 같은 값을 두 곳에서 고치게 하지 않는다.
 * 매입가 숨김은 리포트와 여기 둘 다 같은 기능을 쓴다(같은 캐시라 한쪽에서 바꾸면 다른 쪽도 같다).
 */
export const SettingsPanel = () => {
  const profile = useCoachProfile();

  const coachBody = () => {
    if (profile.isSignedOut) return <Text color="tertiary">{M.signedOut}</Text>;
    if (profile.isPending) return <CoachBlockSkeleton block="zone" />;
    if (profile.isError) return <StatusLine kind="error">{M.unavailable}</StatusLine>;
    return <CoachProfileForm settings={profile.data} />;
  };

  return (
    <div className={layout}>
      <Panel heading={M.coachHeading} description={M.coachDescription}>
        {coachBody()}
      </Panel>
      <Panel heading={M.displayHeading}>
        <PurchasePriceToggle />
      </Panel>
      <Panel heading={M.criteriaHeading}>
        <Link
          href={ROUTES.coachReportSection(COACH_REPORT_SECTIONS.riskBudget)}
          className={navRow}
          aria-label={M.criteriaLinkLabel}
        >
          <span>{M.criteriaLink}</span>
          <NavChevron />
        </Link>
      </Panel>
    </div>
  );
};
