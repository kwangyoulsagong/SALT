"use client";

import { useRouter } from "next/navigation";

import { NavChevron, SideBlock, ZoneLink } from "@repo/web-shared/ui/frame";

import { HOME_DASHBOARD_MESSAGES as M } from "@/entities/home";
import { AlertRow, useAlertList } from "@/entities/notification";

import { alertList, sideMore, sideNote } from "./HomeCards.css";

/** 사이드 줄 수 — 최근 셋(나머지는 알림 화면) */
const HOME_ALERT_ROWS = 3;

/**
 * 홈 오른쪽 "최근 알림"(2026-11-26 — `FE-REQ-048` FR-18). 셸 알림 목록 첫 쪽의 앞 셋 · **읽음 처리 없음**(홈은 읽기 전용 — `fsd-widgets.md`):
 * 누르면 알림 화면으로 간다(읽음 · 갈 곳은 그 화면의 `mark-alert-read`).
 */
export const HomeAlertsSide = () => {
  const router = useRouter();
  const alerts = useAlertList(null);
  const rows = alerts.data?.pages[0]?.alerts.slice(0, HOME_ALERT_ROWS) ?? [];
  return (
    <SideBlock title={M.alertsTitle} titleId="home-alerts-title">
      {alerts.isError ? (
        <p className={sideNote}>{M.unavailable}</p>
      ) : rows.length === 0 ? (
        <p className={sideNote}>{alerts.isPending ? M.loading : M.alertsEmpty}</p>
      ) : (
        <ul className={alertList}>
          {rows.map((alert) => (
            <li key={alert.id}>
              <AlertRow alert={alert} onSelect={() => router.push("/alerts")} />
            </li>
          ))}
        </ul>
      )}
      <ZoneLink href="/alerts" className={sideMore}>
        {M.alertsAll}
        <NavChevron />
      </ZoneLink>
    </SideBlock>
  );
};
