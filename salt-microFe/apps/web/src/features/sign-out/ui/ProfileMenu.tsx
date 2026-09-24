"use client";

import { Menu } from "@repo/ui/menu";

import { ProfileImage, ProfileSection, useAuthState } from "@/entities/auth";

import { useSignOut } from "../api";
import { PROFILE_MENU_ITEM, SIGN_OUT_MESSAGES as MESSAGES } from "../model";
import { header, trigger } from "./ProfileMenu.css";

/**
 * 헤더 프로필 — 누르면 계정 메뉴(설정 · 로그아웃)가 열린다 (2026-09-24 사용자 요청).
 *
 * 프로필은 여러 화면 머리에 같이 뜬다(홈 · 투자). 그래서 메뉴를 화면마다 만들지 않고 이 한 컴포넌트가
 * 전의 `ProfileHeader` 자리를 대신한다. 표시는 `entities/auth` 의 조각을 그대로 쓴다.
 *
 * **설정은 아직 없다** — 코치 성향 설정 화면(FEATURE-004 FR-12)이 서기 전까지 "준비 중"으로 비활성이다.
 * 누를 수 있는데 아무 일도 안 일어나는 항목을 두지 않는다.
 */
export const ProfileMenu = () => {
  const profile = useAuthState();
  const signOut = useSignOut();

  return (
    <header className={header}>
      <Menu
        align="start"
        label={MESSAGES.menuLabel}
        items={[
          { id: PROFILE_MENU_ITEM.settings, label: MESSAGES.settings, disabled: true },
          { id: PROFILE_MENU_ITEM.signOut, label: MESSAGES.signOut, tone: "danger" },
        ]}
        onSelect={(id) => {
          if (id === PROFILE_MENU_ITEM.signOut) signOut();
        }}
        trigger={(props) => (
          <button type="button" className={trigger} {...props}>
            <ProfileImage profile={profile.user?.profileImageUrl ?? undefined} name={profile.user?.nickname} />
            <ProfileSection nickname={profile.user?.nickname} email={profile.user?.email} />
          </button>
        )}
      />
    </header>
  );
};
