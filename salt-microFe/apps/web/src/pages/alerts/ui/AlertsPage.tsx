import Link from "next/link";

import { ROUTES } from "@repo/web-shared/config";
import { BlockBoundary, NavChevron } from "@repo/web-shared/ui";
import { panel, panelDescription, panelTitle } from "@repo/web-shared/ui/surface.css";

import { AlertList } from "@/widgets/alert-list";

import { serverAlerts } from "../api";
import { ALERTS_PAGE } from "../model";
import * as s from "./AlertsPage.css";

/**
 * 알림 `/alerts` — 셸 · 서버 컴포넌트(F006 `FE-REQ-030` FR-110~113). 도메인 셋(투자 · 저축 · 가계부)의 알림을 한 목록에 — 그래서 셸이다
 * (셸은 도메인 화면을 품지 않지만 알림은 도메인을 모르는 코드 + 인자다, `ADR-005` §2). 머리 벨에서 들어온다.
 * 첫 쪽은 서버가 받아 HTML 에 싣고, 다음 쪽 · 읽음은 브라우저. 최상위는 `<div>` — `<main>` 은 `AppShell` 하나.
 */
export const AlertsPage = async () => {
  const initial = await serverAlerts();
  return (
    <div className={s.page}>
      {/* 머리 · 설명 · 목록이 한 본문 패널 위(`screen-desktop.md` §1). 회색 바탕에 바로 두면
          자리표시(neutral 100)가 바탕과 같아 안 보였다(2026-11-18 확인 2회차 — axe · 스크린샷) */}
      <section className={panel}>
        <div className={s.head}>
          <h1 className={panelTitle}>{ALERTS_PAGE.title}</h1>
          <Link href={ROUTES.settings} className={s.settingsLink}>
            {ALERTS_PAGE.settingsLink}
            <NavChevron />
          </Link>
        </div>
        <p className={panelDescription}>{ALERTS_PAGE.description}</p>
        <BlockBoundary name={ALERTS_PAGE.blockName} minHeight={160}>
          <AlertList initial={initial} />
        </BlockBoundary>
      </section>
    </div>
  );
};

export default AlertsPage;
