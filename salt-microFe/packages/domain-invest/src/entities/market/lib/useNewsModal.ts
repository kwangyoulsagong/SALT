"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";

import { NEWS_QUERY_PARAM } from "../model/newsMessages";

/**
 * 뉴스 상세 모달 열기 · 닫기 — 주소 `?news=<id>` 하나가 상태다(`FE-REQ-065` D2: 새로고침 · 뒤로가기로 열고 닫힌다).
 * 열 때 `push`(뒤로가기 = 닫기) · 모달 안에서 다른 소식으로 바꿀 때 `replace` · 닫을 때 우리가 연 것이면 `back`, 주소로 들어온 것이면 쿼리만 지운다.
 * 닫으면 연 행으로 포커스를 돌린다(참고 화면은 `<body>` 로 — 우리는 돌린다)
 */
export const useNewsModal = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const openId = params?.get(NEWS_QUERY_PARAM) ?? null;
  const pushed = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);

  const href = useCallback(
    (id: string | null) => {
      const q = new URLSearchParams(params?.toString() ?? "");
      if (id) q.set(NEWS_QUERY_PARAM, id);
      else q.delete(NEWS_QUERY_PARAM);
      const s = q.toString();
      return s ? `${pathname}?${s}` : pathname;
    },
    [params, pathname],
  );

  const open = useCallback(
    (id: string, from: HTMLElement | null) => {
      trigger.current = from;
      pushed.current = true;
      router.push(href(id), { scroll: false });
    },
    [router, href],
  );

  const select = useCallback((id: string) => router.replace(href(id), { scroll: false }), [router, href]);

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      router.back();
    } else {
      router.replace(href(null), { scroll: false });
    }
    const el = trigger.current;
    trigger.current = null;
    if (el) requestAnimationFrame(() => el.focus());
  }, [router, href]);

  return { openId, open, select, close };
};
