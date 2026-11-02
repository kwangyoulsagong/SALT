"use client";

import { useMemo, useSyncExternalStore } from "react";

import { USER_KEY } from "../config";

/** 로그인 · 초대 수락이 저장한 사용자 — 헤더 프로필 표시에 쓰는 것만 (`SRV-REQ-008` `AccountView` 의 일부). */
export interface SessionUser {
  nickname?: string;
  email?: string;
  profileImageUrl?: string | null;
}

const subscribe = (onChange: () => void) => {
  // 다른 탭의 로그인 · 로그아웃만 알린다. 같은 탭은 로그인 뒤 화면 이동과 함께 다시 그려진다
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
};

const readRaw = (): string | null => {
  try {
    return window.localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
};
const noneOnServer = () => null;

/**
 * 이 기기에 저장된 세션 사용자 (`FE-REQ-053`).
 *
 * 셸은 Redux `auth` 가지로 같은 값을 들고 있지만 **zone 마다 store 가 따로다** — 투자 zone 은 Redux 가 없다.
 * 헤더 프로필 하나를 위해 store 를 zone 에 복제하지 않고, 원천(`localStorage`)을 직접 구독한다.
 * 서버 렌더에서는 `null`(빈 원) — 첫 렌더 마크업이 서버와 같다.
 */
export const useSessionUser = (): SessionUser | null => {
  const raw = useSyncExternalStore(subscribe, readRaw, noneOnServer);
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionUser;
    } catch {
      return null;
    }
  }, [raw]);
};
