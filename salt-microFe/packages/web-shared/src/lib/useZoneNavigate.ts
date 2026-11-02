"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { isCrossZonePath, ZONE_APP } from "../config";

/**
 * 코드에서 하는 이동 — 같은 zone 이면 `router.push`, 다른 zone 이면 문서 이동(`location.assign`) (`FE-REQ-053`).
 *
 * `router.push` 로 다른 zone 경로에 가면 이 앱의 라우트 트리에서 찾다가 실패한다. 판정은 링크(`ZoneLink`)와 같은
 * 레지스트리 · 실행 앱 기준이라 화면이 옮겨 가도 호출부는 그대로다.
 */
export const useZoneNavigate = () => {
  const router = useRouter();
  return useCallback(
    (href: string) => {
      if (isCrossZonePath(href, ZONE_APP)) window.location.assign(href);
      else router.push(href);
    },
    [router],
  );
};
