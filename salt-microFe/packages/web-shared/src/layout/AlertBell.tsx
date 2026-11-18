"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { AppNavigationIcon } from "@repo/ui/app-navigation";

import { useHasSession, useUnreadAlertCount } from "../api";
import { ROUTES } from "../config";
import { ZoneLink } from "../ui";
import { badge, bell } from "./AlertBell.css";
import { ALERT_BELL_MESSAGES as MESSAGES } from "./messages";

/**
 * 머리 알림 벨(F006 `FE-REQ-030` FR-80 · 81) — 모든 zone 머리 오른쪽, 프로필 앞. 누르면 셸 `/alerts`(도메인 zone 에서는 문서 이동).
 * 배지는 안 읽은 수(서버 값) · 0 이면 숨김 · 99+. 로그인하지 않았거나 모를 때(수화 중)는 벨을 그리지 않는다 — 로그인 칸만 남는다.
 * 숫자를 못 받으면(실패) 배지 없이 벨만 — 벨은 늘 알림 화면으로 가는 길이다.
 */
export const AlertBell = () => {
  const signedIn = useHasSession();
  const { data: count = 0, refetch } = useUnreadAlertCount();
  // FR-72 "탭 전환 시 · 알림 화면을 떠날 때 다시 조회" — zone 을 넘는 이동은 문서가 새로 떠 저절로 부르지만, 같은 zone 안 이동
  // (셸 /home → /alerts → /settings)은 벨이 남아 있어 안 부른다. 주소가 바뀔 때 한 번(첫 렌더는 쿼리가 이미 부른다). 폴링 아님
  const pathname = usePathname();
  const seen = useRef(pathname);
  useEffect(() => {
    if (seen.current === pathname) return;
    seen.current = pathname;
    if (signedIn === true) void refetch();
  }, [pathname, signedIn, refetch]);
  if (signedIn !== true) return null;
  return (
    <ZoneLink href={ROUTES.alerts} className={bell} aria-label={MESSAGES.label(count)}>
      <AppNavigationIcon name="bell" size={20} />
      {count > 0 ? (
        <span className={badge} aria-hidden="true">
          {MESSAGES.badge(count)}
        </span>
      ) : null}
    </ZoneLink>
  );
};
