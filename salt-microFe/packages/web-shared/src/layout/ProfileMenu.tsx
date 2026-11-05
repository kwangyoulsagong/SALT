"use client";

import { Menu } from "@repo/ui/menu";
import { useQueryClient } from "@tanstack/react-query";

import { clearSession, useSessionUser } from "../api";
import { ROUTES } from "../config";
import { PROFILE_MENU_ITEM, PROFILE_MENU_MESSAGES as MESSAGES } from "./messages";
import { header, trigger } from "./ProfileMenu.css";
import { ProfileImage } from "./ProfileImage";
import { ProfileSection } from "./ProfileSection";

/**
 * 헤더 프로필 — 누르면 계정 메뉴(설정 · 로그아웃)가 열린다 (2026-09-24 사용자 요청).
 *
 * 프로필은 모든 화면 머리 오른쪽 한 자리다 — `AppShell` 이 `@repo/ui` `AppNavigation` 머리에 넣는다(`FE-REQ-054`, 2026-11-03).
 * 전에는 화면마다(홈 · 투자) 따로 놓았다. **zone 이 갈려서**(`ADR-005`) 셸 `features/sign-out` 에서 이리로 옮겼다(`FE-REQ-053`).
 * 머리가 `<header>` 라 여기는 `<div>` 다(중첩 금지).
 *
 * ## 이동은 문서 이동이다
 *
 * 설정(`/settings`) · 로그인(`/`)은 셸 화면이다. 투자 zone 에서 `router.push` 로 가면 투자 앱 안의 없는
 * 경로가 된다 — 그래서 `location.assign`. 셸에서도 같은 동작으로 둔다: 로그아웃이 문서를 새로 받으면
 * 메모리의 Redux · 쿼리 캐시가 같이 비워진다(전에는 `logout()` 디스패치 + `queryClient.clear()` 를 손으로).
 *
 * ## 서버를 부르지 않는다
 *
 * 서버 · BFF 에 로그아웃 경로가 없다. 토큰은 서버에 저장되지 않는 JWT 라서 이 기기의 쿠키를 지우는 것이
 * 곧 로그아웃이다(셸 Route Handler — `FE-REQ-013` FR-80 2단계). 리프레시 토큰을 서버에서 무효화하는 일은 서버 몫으로 남았다.
 */
export const ProfileMenu = () => {
  const user = useSessionUser();
  const queryClient = useQueryClient();

  const signOut = async () => {
    // 쿠키는 Route Handler 가 지운다 — 응답을 기다린 뒤 이동해야 로그인 화면 요청에 세션이 실리지 않는다
    await clearSession();
    // 문서가 바뀌기 전에 다음 사람에게 보일 캐시를 지운다(같은 문서에서 이어 그리는 경우 대비)
    queryClient.clear();
    window.location.assign(ROUTES.login);
  };

  return (
    <div className={header}>
      <Menu
        align="end"
        label={MESSAGES.menuLabel}
        items={[
          { id: PROFILE_MENU_ITEM.settings, label: MESSAGES.settings },
          { id: PROFILE_MENU_ITEM.signOut, label: MESSAGES.signOut, tone: "danger" },
        ]}
        onSelect={(id) => {
          if (id === PROFILE_MENU_ITEM.settings) window.location.assign(ROUTES.settings);
          if (id === PROFILE_MENU_ITEM.signOut) void signOut();
        }}
        trigger={(props) => (
          <button
            type="button"
            className={trigger}
            // 로그아웃 상태면 닉네임이 비어 버튼 이름이 없다(axe button-name) — 그때만 메뉴 이름을 준다
            aria-label={user?.nickname ? undefined : MESSAGES.menuLabel}
            {...props}
          >
            <ProfileImage profile={user?.profileImageUrl ?? undefined} name={user?.nickname} />
            <ProfileSection nickname={user?.nickname} email={user?.email} />
          </button>
        )}
      />
    </div>
  );
};
