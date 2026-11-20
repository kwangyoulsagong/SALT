"use client";

import { useSessionUser } from "../../api";
import { ProfileImage } from "../ProfileImage";

import { MOBILE_HOME_MESSAGES as M } from "./messages";
import { profileHead, profileName, profileSub, profileText } from "./MobileHome.css";

/**
 * 휴대폰 홈 머리 — 프로필 사진(없으면 이니셜 원) · 이름 · 이메일(사용자 Figma "홈" 390, `FE-REQ-072` 2026-11-20).
 * 사용자는 이 기기 저장소의 세션 사용자(데스크톱 머리 프로필과 같은 원천) — 서버 렌더 · 첫 렌더는 이름 대신 "홈"(수화 일치)
 */
export const MobileProfileHead = () => {
  const user = useSessionUser();
  return (
    <header className={profileHead}>
      <ProfileImage profile={user?.profileImageUrl ?? undefined} name={user?.nickname} />
      <div className={profileText}>
        <h1 className={profileName}>{user?.nickname ?? M.title}</h1>
        {user?.email ? <span className={profileSub}>{user.email}</span> : null}
      </div>
    </header>
  );
};
