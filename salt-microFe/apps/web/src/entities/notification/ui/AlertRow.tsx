"use client";

import { AppNavigationIcon, type AppNavigationIconName } from "@repo/ui/app-navigation";

import { formatAlertTime } from "../lib";
import type { AlertKind, AlertVM } from "../model/alerts";
import { ALERT_MESSAGES, alertTextOf } from "../model/messages";
import * as s from "./AlertRow.css";

/** 종류 → 도메인 탭 아이콘(같은 글리프 — 어느 도메인 알림인지 탭과 같은 그림으로) */
const KIND_ICON: Readonly<Record<AlertKind, AppNavigationIconName>> = {
  signal_update: "chart",
  goal_reached: "coin",
  fixed_cost_increased: "wallet",
};

interface AlertRowProps {
  alert: AlertVM;
  onSelect: (alert: AlertVM) => void;
}

/**
 * 알림 한 줄(`FE-REQ-030` FR-110) — 아이콘 · 제목 · 확인할 곳 · 시각, 안 읽음은 굵게 + 점. **표시만** — 누르면 `onSelect` 를 부를 뿐
 * (읽음 · 이동은 `features/mark-alert-read`). 문장이 없는 코드면 줄을 그리지 않는다(`FE-REQ-031` FR-93).
 */
export const AlertRow = ({ alert, onSelect }: AlertRowProps) => {
  const text = alertTextOf(alert.messageCode, alert.params, alert.symbol);
  if (!text) return null;
  return (
    <button type="button" className={s.row} onClick={() => onSelect(alert)}>
      <span className={s.iconPlate}>
        <AppNavigationIcon name={KIND_ICON[alert.kind]} size={16} />
      </span>
      <span className={s.text}>
        <span className={alert.isRead ? s.title : `${s.title} ${s.titleUnread}`}>{text.title}</span>
        <span className={s.hint}>{text.hint}</span>
      </span>
      <span className={s.meta}>
        {alert.isRead ? null : <span className={s.dot} role="img" aria-label={ALERT_MESSAGES.unreadDot} />}
        <time className={s.time} dateTime={alert.createdAt}>
          {formatAlertTime(alert.createdAt)}
        </time>
      </span>
    </button>
  );
};
