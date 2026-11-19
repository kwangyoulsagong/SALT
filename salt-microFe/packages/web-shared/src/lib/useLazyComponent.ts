"use client";

import { useCallback, useRef, useState, type ComponentType } from "react";

/**
 * **화면이 그려진 뒤(누를 때 · 주소가 바뀔 때) 받는 잎** — 청크를 못 받아도 이미 그린 화면을 지우지 않는다(2026-11-19 `FE-REQ-033` FR-74).
 *
 * `next/dynamic` 은 청크 실패를 렌더 오류로 던져 가장 가까운 `SectionBoundary` 까지 올라간다 — 거래 시트 버튼을 눌렀다가 청크가 끊기자
 * 포트폴리오 페이지 전체가 "불러오지 못했습니다" 한 줄이 됐다(운영 빌드 · 청크 요청 차단 실측). 첫 화면에 필요한 잎은 그대로 `next/dynamic`
 * (섹션이 못 그리면 섹션 오류가 맞다), 나중에 받는 잎만 이것으로: `ensure()` 가 받고, 실패는 `failed` 로 알린다. 다시 부르면 다시 받는다.
 *
 * `load` 는 모듈 최상위 함수로 둔다(렌더마다 새 함수면 `ensure` 가 매번 바뀐다).
 */
export const useLazyComponent = <P extends object>(load: () => Promise<ComponentType<P>>) => {
  const [Component, setComponent] = useState<ComponentType<P> | null>(null);
  const [failed, setFailed] = useState(false);
  const loaded = useRef<ComponentType<P> | null>(null);

  const ensure = useCallback(async (): Promise<boolean> => {
    if (loaded.current) return true;
    setFailed(false);
    try {
      const next = await load();
      loaded.current = next;
      setComponent(() => next);
      return true;
    } catch {
      setFailed(true);
      return false;
    }
  }, [load]);

  return { Component, failed, ensure };
};
