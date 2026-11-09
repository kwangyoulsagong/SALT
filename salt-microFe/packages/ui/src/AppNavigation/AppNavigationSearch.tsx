"use client";

// 클라이언트 잎: 문서 전체의 `/` 키를 듣는다.
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import { searchBox, searchKey, srOnly } from "./AppNavigationSearch.css";
import { isTypingTarget } from "./isTypingTarget";

/** 단축키 — 칸 안 글자와 `aria-keyshortcuts` 가 같은 값을 쓴다 */
export const APP_NAVIGATION_SEARCH_KEY = "/";

export interface AppNavigationSearchProps {
  /** 무엇을 찾는 칸인지(화면 리더 앞말) — 예: "종목 검색" */
  label: string;
  /** 칸 안 글자(키 뒤) — 예: "를 눌러 검색해요" */
  hint: string;
  /** 있으면 링크(`<a>`) — 검색이 다른 zone 에 있을 때. 없으면 단추이고 `onPress` 를 부른다 */
  href?: string;
  onPress?: () => void;
  /** 문서 어디서나 `/` 로 누른다(글을 쓰는 중이 아닐 때). 기본 켬 */
  shortcut?: boolean;
}

/**
 * 머리 검색칸 (`FE-REQ-067` FR-2 · `FE-REQ-066` FR-1). 무엇을 여는지는 부르는 쪽 몫 — 모달을 여는 단추이거나 검색 화면 링크다.
 * 이 패키지는 라우팅을 모른다(`design-system.md`).
 *
 * 화면 리더 이름은 보이는 글자를 포함한다(`label` + 보이는 안내 — 이름에 보이는 글을 담는다). `/` 키는 칸을 누른 것과 같다 —
 * 링크면 그 링크로, 단추면 `onPress`. 닫힌 뒤 포커스는 연 쪽(모달)이 이 칸으로 돌린다 — `ref` 로 칸을 잡는다
 */
export const AppNavigationSearch = forwardRef<HTMLElement, AppNavigationSearchProps>(
  ({ label, hint, href, onPress, shortcut = true }, ref) => {
    const elementRef = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
    useImperativeHandle(ref, () => elementRef.current as HTMLElement);

    useEffect(() => {
      if (!shortcut) return undefined;
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== APP_NAVIGATION_SEARCH_KEY || event.metaKey || event.ctrlKey || event.altKey) return;
        if (event.defaultPrevented || isTypingTarget(event)) return;
        // 다른 모달(뉴스 상세 등)이 열려 있으면 그 위에 겹쳐 열지 않는다 — 포커스 가둠 둘이 서로 다툰다
        if (document.querySelector('[aria-modal="true"]')) return;
        event.preventDefault();
        elementRef.current?.click();
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [shortcut]);

    const body = (
      <>
        <span className={srOnly}>{label} — </span>
        <span className={searchKey}>{APP_NAVIGATION_SEARCH_KEY}</span>
        <span>{hint}</span>
      </>
    );

    return href ? (
      <a ref={elementRef} href={href} className={searchBox} aria-keyshortcuts={APP_NAVIGATION_SEARCH_KEY}>
        {body}
      </a>
    ) : (
      <button
        ref={elementRef}
        type="button"
        className={searchBox}
        aria-haspopup="dialog"
        aria-keyshortcuts={APP_NAVIGATION_SEARCH_KEY}
        onClick={onPress}
      >
        {body}
      </button>
    );
  },
);
AppNavigationSearch.displayName = "AppNavigationSearch";
