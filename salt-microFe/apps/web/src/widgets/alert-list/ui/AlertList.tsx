"use client";

import { Button } from "@repo/ui/button";
import { EmptyState } from "@repo/ui/emptyState";
import { StatusGraphic } from "@repo/ui/statusGraphic";

import { useHasSession } from "@repo/web-shared/api";
import { alertTargetHref } from "@repo/web-shared/config";
import { useZoneNavigate } from "@repo/web-shared/lib";

import { AlertRow, alertTextOf, useAlertList, type AlertsVM, type AlertVM } from "@/entities/notification";
import { MarkAllReadButton, useMarkAlertRead } from "@/features/mark-alert-read";

import { ALERT_LIST_MESSAGES as MESSAGES } from "../model";
import * as s from "./AlertList.css";

interface AlertListProps {
  /** 서버 컴포넌트가 받은 첫 쪽 — 못 받았으면 null(브라우저가 1쪽부터) */
  initial: AlertsVM | null;
}

/**
 * 알림 목록(`FE-REQ-030` FR-110~113) — 최신순 · 행을 누르면 읽음(낙관적) + `target` 으로 이동 · [모두 읽음] · 다음 쪽은 [더 보기].
 * 만드는 칸 · 조건 알림 · 피드 0(FR-113). 갈 곳 경로는 `@repo/web-shared/config` `alertTargetHref` 한 곳.
 */
export const AlertList = ({ initial }: AlertListProps) => {
  const list = useAlertList(initial);
  const markRead = useMarkAlertRead();
  const navigate = useZoneNavigate();
  const signedIn = useHasSession();

  if (signedIn === false) return <EmptyState title={MESSAGES.signedOut} />;
  if (list.isError && !list.data) return <EmptyState title={MESSAGES.loadFailed} tone="error" />;
  if (!list.data) return null;

  // 문장이 없는 코드의 줄은 그리지 않으므로(FR-93) 빈 상태 · 안 읽음 판정도 그릴 줄 기준
  const alerts = list.data.pages.flatMap((page) => page.alerts).filter((a) => alertTextOf(a.messageCode, a.params, a.symbol));
  const hasUnread = alerts.some((a) => !a.isRead);

  const open = (alert: AlertVM) => {
    if (!alert.isRead) markRead.mutate(alert.id);
    navigate(alertTargetHref(alert.target, alert.symbol));
  };

  if (alerts.length === 0 && !list.hasNextPage) {
    return <EmptyState icon={<StatusGraphic kind="empty" />} title={MESSAGES.empty} description={MESSAGES.emptyDescription} />;
  }

  return (
    <div>
      <div className={s.head}>
        <MarkAllReadButton hasUnread={hasUnread} />
      </div>
      <ul className={s.list} aria-label={MESSAGES.listLabel}>
        {alerts.map((alert) => (
          <li key={alert.id}>
            <AlertRow alert={alert} onSelect={open} />
          </li>
        ))}
      </ul>
      {list.hasNextPage ? (
        <div className={s.footer}>
          <Button size="sm" variant="ghost" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
            {MESSAGES.more}
          </Button>
          {list.isFetchNextPageError ? <p role="status">{MESSAGES.moreFailed}</p> : null}
        </div>
      ) : null}
    </div>
  );
};
