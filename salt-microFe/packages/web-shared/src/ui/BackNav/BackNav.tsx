"use client";

// 클라이언트 잎: 누를 때 브라우저 기록을 본다(렌더 중에는 읽지 않는다 — 서버 · 첫 렌더는 같은 `<a href>`)
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { MouseEvent } from "react";

import { button, crumb, crumbLink, current, nav, row, separator, trail } from "./BackNav.css";

export interface BackNavCrumb {
  label: string;
  /** 없으면 지금 화면(마지막 칸) */
  href?: string;
}

export interface BackNavProps {
  /** 뒤로 버튼 이름(화면 리더 · 툴팁) — 문구는 부르는 쪽 몫 */
  label: string;
  /** 같은 앱에서 온 게 아니면 갈 곳(목록 주소 — 탭 · 자산군이 주소에 있다) */
  fallbackHref: string;
  /** 이동 경로 — 마지막은 지금 화면 */
  crumbs: readonly BackNavCrumb[];
  /** 이동 경로 이름(화면 리더) */
  trailLabel: string;
}

interface NavigationEntryLike {
  index: number;
  url: string | null;
}
interface NavigationLike {
  currentEntry: NavigationEntryLike | null;
  entries: () => NavigationEntryLike[];
}

/**
 * 바로 앞 기록이 이 앱(같은 origin)인가 — 그러면 브라우저 뒤로가 목록의 탭 · 필터 · 스크롤을 그대로 돌려준다.
 * `document.referrer` 만 보면 안 된다: 같은 zone 안 이동(soft navigation)은 referrer 를 바꾸지 않아 늘 "밖에서 왔다"로 읽혀
 * 링크로 새로 들어갔다(2026-11-19 실측 — 탭 · 스크롤을 잃음). 기록 API(Navigation API)의 앞 항목을 먼저 보고, 없는 브라우저는 referrer(zone 을 넘어온 문서 이동)
 */
const cameFromThisApp = () => {
  try {
    const navigation = (window as unknown as { navigation?: NavigationLike }).navigation;
    const current = navigation?.currentEntry;
    if (navigation && current) {
      if (current.index <= 0) return false;
      const previous = navigation.entries()[current.index - 1];
      return Boolean(previous?.url) && new URL(previous!.url!).origin === window.location.origin;
    }
    return document.referrer !== "" && new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
};

/**
 * 상세 머리 첫 줄 — 뒤로 버튼 + 이동 경로(`FE-REQ-047` FR-10, `screen-desktop.md` §4 "뒤로").
 * 누르면 같은 앱에서 왔을 때 브라우저 뒤로, 아니면(주소로 바로 들어옴 · 새 탭) `fallbackHref`. 자바스크립트가 없어도 `<a>` 라 목록으로 간다.
 * 경로 칸 링크는 같은 zone 안이라 문서 이동이 아닌 평범한 `<a>` 로 둔다 — 공용 패키지라 라우터를 모른다
 */
export const BackNav = ({ label, fallbackHref, crumbs, trailLabel }: BackNavProps) => {
  const onBack = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    if (!cameFromThisApp()) return;
    event.preventDefault();
    window.history.back();
  };

  return (
    <div className={row}>
      <a href={fallbackHref} className={button} aria-label={label} title={label} onClick={onBack}>
        <ChevronLeft size={24} strokeWidth={2} aria-hidden="true" />
      </a>
      <nav className={nav} aria-label={trailLabel}>
        <ol className={trail}>
          {crumbs.map((item, index) => (
            <li key={`${item.label}-${index}`} className={crumb}>
              {index > 0 ? (
                <ChevronRight className={separator} size={12} strokeWidth={2} aria-hidden="true" />
              ) : null}
              {item.href ? (
                <a href={item.href} className={crumbLink}>
                  {item.label}
                </a>
              ) : (
                <span className={current} aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};
