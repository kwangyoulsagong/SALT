"use client";

// 클라이언트 잎: 머리 검색칸이 문서 전체의 `/` 키를 듣는다(`@repo/ui` `AppNavigationSearch`).
import { AppNavigationSearch } from "@repo/ui/app-navigation";

import { ROUTES } from "../config";
import { NAVIGATION_FRAME_MESSAGES } from "./messages";

/**
 * 머리 검색칸 기본값 (`FE-REQ-067` FR-2) — 검색 모달이 없는 zone(셸 · 저축 · 가계부)에서는 투자 zone `/search` 로 가는 링크다.
 * 그 주소가 모달을 연 채로 그린다(`FE-REQ-066` FR-1 · D5). 투자 zone 은 레이아웃이 모달을 여는 칸으로 바꿔 꽂는다(`AppShell` `headerSearch`).
 * 다른 zone 으로 가는 문서 이동이라 `<a>` 다(`microfrontend.md` §4)
 */
export const HeaderSearchLink = () => (
  <AppNavigationSearch
    href={ROUTES.search}
    label={NAVIGATION_FRAME_MESSAGES.searchLabel}
    hint={NAVIGATION_FRAME_MESSAGES.searchHint}
  />
);
