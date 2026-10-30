"use client";

import useDebounce from "@repo/ui/useDebounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { SEARCH_DEBOUNCE_MS, SEARCH_QUERY_PARAM } from "../model/constants";
import { pushRecentSearch, readRecentSearches } from "./recentSearches";

/**
 * 검색어 상태 — 입력은 로컬, 확정값은 주소 `?q=`(`FE-REQ-011` FR-80). 전역 스토어에 두지 않는다.
 *
 * - `input` 은 타이핑 그대로, `query` 는 300ms 뒤 앞뒤 공백을 지운 값(FR-81 · 82) — 조회는 `query` 만 본다
 * - 주소는 `replace` 로 고친다. 글자마다 방문 기록이 쌓이면 뒤로가기가 한 글자씩 지운다
 * - 최근 검색은 **행을 눌렀을 때만** 남긴다(FR-83) — `remember` 를 부르는 쪽이 정한다
 */
export const useAssetSearchQuery = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const fromUrl = (params?.get(SEARCH_QUERY_PARAM) ?? "").trim();

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
      const search = new URLSearchParams(params?.toString() ?? "");
      if (next) search.set(SEARCH_QUERY_PARAM, next);
      else search.delete(SEARCH_QUERY_PARAM);
      const qs = search.toString();
      router.replace(qs ? `${pathname}?${qs}` : (pathname ?? ""), { scroll: false });
    },
    [params, pathname, router],
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

  const remember = useCallback(() => {
    if (query) setRecent((current) => pushRecentSearch(current, query));
  }, [query]);

  return { input, setInput, setInputNow, query, recent, remember };
};
