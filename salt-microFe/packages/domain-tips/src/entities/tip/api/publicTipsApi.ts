import { BFF_SERVER_URL } from "@repo/web-shared/config";

import type { TipDetail, TipList } from "../model/types";

/**
 * **서버 컴포넌트 · 메타데이터 전용** 공개 글 조회(`FE-REQ-058` FR-1) — 인증 없음 · 개인 데이터 0이라 토큰을 붙이지 않는다.
 * `apiFetch`(브라우저 세션)를 거치지 않는 맨 `fetch` — Next 데이터 캐시(ISR)를 쓰려면 `next.revalidate` 를 직접 줘야 한다
 * (투자 `publicMarketApi` 와 같은 꼴). 실패는 null — 목록은 "준비 중", 글은 404 로 그린다.
 */
export const TIPS_REVALIDATE_SECONDS = 60;
const TIMEOUT_MS = 3_000;

const get = async <T>(path: string): Promise<T | null> => {
  try {
    const response = await fetch(`${BFF_SERVER_URL}/api/app/tips${path}`, {
      next: { revalidate: TIPS_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
};

const list = () => get<TipList>("");

export const publicTipsApi = {
  list,
  /**
   * 글 하나 — **목록이 공개이고 그 slug 가 목록에 있을 때만** 글을 부른다.
   *
   * 글 응답만 보면 낡은 공개 글이 계속 나간다: Next 데이터 캐시는 다시 부른 응답이 404 면 앞서 저장한 200 을 덮지 않는다
   * (2026-11-05 실화면 — 공개 플래그를 끈 뒤 3분 넘게 글이 200). 목록은 꺼져도 200(`public: false`)이라 늘 새 값으로 바뀐다 —
   * 법무 확인 전 · 원문에서 빠진 글을 목록 하나가 막는다. 같은 목록 fetch 는 한 요청 안에서 한 번만 나간다.
   */
  detail: async (slug: string): Promise<TipDetail | null> => {
    const index = await list();
    if (!index?.public || !index.tips.some((tip) => tip.slug === slug)) return null;
    return get<TipDetail>(`/${encodeURIComponent(slug)}`);
  },
};
