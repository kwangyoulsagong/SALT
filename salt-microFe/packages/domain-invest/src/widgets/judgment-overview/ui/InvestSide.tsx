"use client";

// 클라이언트 잎: 관심 종목 · 요약 칸이 로그인 세션 쿼리를 쓴다
import { AssetIcon } from "@repo/ui/assetIcon";
import Link from "next/link";

import { useWatchlist } from "@/entities/market";
import { ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";

import { JUDGMENT_OVERVIEW_MESSAGES } from "../model";
import { down, flat, headLink, list, name, note, rate, row, stack, up } from "./InvestSide.css";
import { JudgmentOverview } from "./JudgmentOverview";

const M = JUDGMENT_OVERVIEW_MESSAGES.side;

const rateClass = (value: number) => (value > 0 ? up : value < 0 ? down : flat);

/** 등락은 색 + 부호를 같이(색만으로 전하지 않는다) — 값은 서버가 준 것 그대로 */
const formatRate = (value: number) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

const WatchlistSide = () => {
  const watchlist = useWatchlist();
  if (watchlist.isSignedOut || watchlist.isPending) return null;
  const items = watchlist.data?.items ?? [];
  return (
    <section className={stack} aria-label={M.watchlistHeading}>
      <Link href={ROUTES.investmentsWatchlist} className={headLink} aria-label={M.watchlistLink}>
        <span>{M.watchlistHeading}</span>
        <NavChevron />
      </Link>
      {watchlist.isError ? (
        <p className={note}>{M.watchlistUnavailable}</p>
      ) : items.length === 0 ? (
        <p className={note}>{M.watchlistEmpty}</p>
      ) : (
        <ul className={list}>
          {items.map((item) => (
            <li key={item.id}>
              <Link href={ROUTES.investmentDetail(item.symbol)} className={row}>
                <AssetIcon symbol={item.symbol} src={item.logoUrl ?? undefined} name={item.name} size="sm" />
                <span className={name}>{item.name}</span>
                {item.changeRate === null ? null : (
                  <span className={`${rate} ${rateClass(item.changeRate)}`}>{formatRate(item.changeRate)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/**
 * 투자 오른쪽 사이드(`FE-REQ-047` FR-7 · FR-12) — 위험 · 판정 성적 두 칸(시세 화면 요약 띠와 같은 칸 · 같은 갈 곳) + 관심 종목.
 * 시세 화면(`/investments`)에는 달지 않는다 — 거기는 표 오른쪽 미리보기 칸이 그 자리다(2026-11-19 사용자 결정). 로그아웃이면 비어 있다
 */
export const InvestSide = () => (
  <div className={stack}>
    <JudgmentOverview layout="side" />
    <WatchlistSide />
  </div>
);
