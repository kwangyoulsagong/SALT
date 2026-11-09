"use client";

import useDebounce from "@repo/ui/useDebounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { SEARCH_DEBOUNCE_MS, SEARCH_QUERY_PARAM } from "../model/constants";
import { pushRecentSearch, readRecentSearches, removeRecentSearch } from "./recentSearches";

/**
 * 검색어 상태 — 입력은 로컬, 확정값은 주소 `?q=`(`FE-REQ-011` FR-80). 전역 스토어에 두지 않는다.
 *
 * - **모달(`FE-REQ-066` FR-5)은 주소를 바꾸지 않는다** — `syncUrl: false`. 아무 화면에서 열고 닫아도 주소 그대로.
 *   `/search` 주소로 연 모달만 `?q=` 를 읽고 쓴다(링크 · 새로고침 호환, D5)
 *
 * - `input` 은 타이핑 그대로, `query` 는 300ms 뒤 앞뒤 공백을 지운 값(FR-81 · 82) — 조회는 `query` 만 본다
 * - 주소는 `replace` 로 고친다. 글자마다 방문 기록이 쌓이면 뒤로가기가 한 글자씩 지운다
 * - 최근 검색은 **행을 눌렀을 때만** 남긴다(FR-83) — `remember` 를 부르는 쪽이 정한다
 */
export const useAssetSearchQuery = ({ syncUrl }: { syncUrl: boolean }) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const fromUrl = syncUrl ? (params?.get(SEARCH_QUERY_PARAM) ?? "").trim() : "";

  const [input, setInputState] = useState(fromUrl);
  const [query, setQuery] = useState(fromUrl);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => setRecent(readRecentSearches()), []);

  // 뒤로 · 앞으로로 주소만 바뀌면 입력도 따라간다
  useEffect(() => {
    setQuery(fromUrl);
    setInputState((current) => (current.trim() === fromUrl ? current : fromUrl));
  }, [fromUrl]);

  const commit = useCallback(
    (value: string) => {
      const next = value.trim();
      setQuery(next);
      if (!syncUrl) return;
      const search = new URLSearchParams(params?.toString() ?? "");
      if (next) search.set(SEARCH_QUERY_PARAM, next);
      else search.delete(SEARCH_QUERY_PARAM);
      const qs = search.toString();
      router.replace(qs ? `${pathname}?${qs}` : (pathname ?? ""), { scroll: false });
    },
    [params, pathname, router, syncUrl],
  );
  const commitLater = useDebounce(commit, SEARCH_DEBOUNCE_MS);

  const setInput = useCallback(
    (value: string) => {
      setInputState(value);
      commitLater(value);
    },
    [commitLater],
  );

  /** 칩 · 지우기 — 기다리지 않고 바로 확정한다 */
  const setInputNow = useCallback(
    (value: string) => {
      setInputState(value);
      commit(value);
    },
    [commit],
  );

  /**
   * 고른 행으로 갈 때 — 디바운스 전에 Enter 를 누르면 확정값이 아직 옛 글자라 지금 입력을 넘긴다.
   * **저장은 업데이터 밖에서 바로 한다** — 업데이터는 다음 렌더에 돈다. 행을 고르면 모달이 닫혀 그 렌더가 오지 않아 저장이 사라졌다
   * (2026-11-09 실화면). 기준 목록은 기기 저장소에서 다시 읽는다(다른 탭 · 다른 모달이 쓴 것까지)
   */
  const remember = useCallback(
    (value: string = query) => {
      const next = value.trim();
      if (next) setRecent(pushRecentSearch(readRecentSearches(), next));
    },
    [query],
  );

  /** 칩 × — 그 검색어만 지운다(저장은 위와 같은 이유로 바로) */
  const forget = useCallback((value: string) => setRecent(removeRecentSearch(readRecentSearches(), value)), []);

  return { input, setInput, setInputNow, query, recent, remember, forget };
};
