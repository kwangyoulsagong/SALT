"use client";

import { useEffect, useRef } from "react";

import { formatPrice } from "@repo/web-shared/lib";

import { INVESTMENT_DETAIL_PAGE_MESSAGES as M } from "../model/messages";

/** 탭 제목 갱신 간격 — 1초에 한 번까지(`FE-REQ-049` FR-12 — 체결마다 바꾸면 탭이 깜빡인다) */
const TITLE_MIN_INTERVAL_MS = 1_000;

interface LiveTabIdentity {
  name: string | null;
  /** 원 — 실시간 구독 값(없으면 서버 첫 값) */
  price: number | null;
  /** 전일 대비 %(코인은 업비트 09:00 기준) */
  changeRate: number | null;
  /** 종목 로고 — 파비콘으로(사용자 2026-11-09). 없으면 원래 아이콘 그대로 */
  logoUrl: string | null;
  /** 장 밖(장 마감 · 휴장) — 국내만 */
  closed?: boolean;
}

const rateText = (v: number) => `${v > 0 ? "+" : v < 0 ? "-" : ""}${Math.abs(v).toFixed(2)}%`;

/**
 * 상세에 있는 동안 브라우저 탭을 그 종목으로 — 제목 `{가격} {등락률} | {이름}`(실시간, 1초에 한 번까지) · 파비콘 = 종목 로고.
 * **수화 뒤 브라우저에서만** 바꾼다 — 서버 HTML `<title>` 은 그대로(국내 시세는 공개 HTML 에 싣지 않는다, `FE-REQ-049` FR-12).
 * 화면을 떠나면 원래 제목 · 아이콘으로 되돌린다
 */
export const useLiveTabIdentity = ({ name, price, changeRate, logoUrl, closed = false }: LiveTabIdentity) => {
  const lastAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 우리가 마지막으로 쓴 제목 — 떠날 때 지금 제목이 이것일 때만 되돌린다 */
  const written = useRef<string | null>(null);

  // 제목 — 처음 값을 기억했다가 떠날 때 되돌린다
  useEffect(() => {
    const original = document.title;
    return () => {
      if (timer.current) clearTimeout(timer.current);
      // 다음 화면이 이미 제목을 썼으면 건드리지 않는다 — 기억한 제목으로 덮으면 목록에 상세 제목이 남았다(2026-11-09 실화면)
      if (written.current !== null && document.title === written.current) document.title = original;
    };
  }, []);

  useEffect(() => {
    if (!name || price === null || changeRate === null) return;
    const title = M.tabTitle(`${formatPrice(price)}원`, rateText(changeRate), name, closed);
    const apply = () => {
      lastAt.current = Date.now();
      timer.current = null;
      written.current = title;
      document.title = title;
    };
    const wait = TITLE_MIN_INTERVAL_MS - (Date.now() - lastAt.current);
    if (timer.current) clearTimeout(timer.current);
    if (wait <= 0) apply();
    else timer.current = setTimeout(apply, wait);
  }, [name, price, changeRate, closed]);

  // 파비콘 — 있는 아이콘 링크의 주소를 바꾸고 떠날 때 되돌린다(링크를 새로 만들지 않는다 — Next 가 관리하는 머리와 다투지 않게)
  useEffect(() => {
    if (!logoUrl) return;
    const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')];
    const saved = links.map((l) => [l, l.href, l.type] as const);
    for (const l of links) {
      l.href = logoUrl;
      l.removeAttribute("type");
    }
    return () => {
      for (const [l, href, type] of saved) {
        l.href = href;
        if (type) l.type = type;
      }
    };
  }, [logoUrl]);
};
