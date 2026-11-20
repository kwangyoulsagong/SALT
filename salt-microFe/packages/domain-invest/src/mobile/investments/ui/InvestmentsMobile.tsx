"use client";

import { AssetIcon } from "@repo/ui/assetIcon";
import { Skeleton } from "@repo/ui/skeleton";
import Link from "next/link";

import { MOBILE_PATHS, MOBILE_ROUTES } from "@repo/core/mobile";
import { MobileCard, MobileSection } from "@repo/web-shared/layout/mobile";

import { useWatchlist } from "@/entities/market";

import { INVESTMENTS_MOBILE as M } from "../model/messages";
import * as s from "./investmentsMobile.css";

const MINUS = "−";
/** 등락은 색 + 부호를 같이 — 값은 서버가 준 것 그대로 */
const rateText = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? MINUS : ""}${Math.abs(value).toFixed(2)}%`;
const rateTone = (value: number) =>
  value > 0 ? s.up : value < 0 ? s.down : s.flat;

const Chevron = () => (
  <svg
    className={s.chevron}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    aria-hidden
    focusable="false"
  >
    <path
      d="M9 5l7 7-7 7"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 휴대폰 투자 탭 본문(`FE-REQ-072` FR-3) — 코치 리포트 행 → 관심 종목 행(누르면 `/m/investments/[symbol]` 한 장 패널).
 * 데스크톱 시세 표(100행 실시간)는 휴대폰에 옮기지 않는다 — 투자는 동결(`ADR-005` §5), 휴대폰은 기획된 상세 · 리포트만
 */
export const InvestmentsMobile = () => {
  const watchlist = useWatchlist();
  return (
    <>
      <MobileCard>
        <ul className={s.rows}>
          <li>
            <Link href={MOBILE_ROUTES.coachReport} className={s.row}>
              <span className={s.main}>
                <span className={s.name}>{M.reportTitle}</span>
                <span className={s.sub}>{M.reportHint}</span>
              </span>
              <Chevron />
            </Link>
          </li>
        </ul>
      </MobileCard>
      <MobileSection title={M.watchlist}>
        {watchlist.isSignedOut ? (
          <>
            <p className={s.note}>{M.signedOut}</p>
            <Link href={MOBILE_PATHS.login} className={s.textLink}>
              {M.signIn}
            </Link>
          </>
        ) : watchlist.isPending ? (
          <Skeleton height={240} />
        ) : watchlist.isError ? (
          <p className={s.note}>{M.watchlistUnavailable}</p>
        ) : (watchlist.data?.items ?? []).length === 0 ? (
          <p className={s.note}>{M.watchlistEmpty}</p>
        ) : (
          <ul className={s.rows}>
            {watchlist.data.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={MOBILE_ROUTES.investment(item.symbol)}
                  className={s.row}
                >
                  <AssetIcon
                    symbol={item.symbol}
                    src={item.logoUrl ?? undefined}
                    name={item.name}
                    size="md"
                  />
                  <span className={s.main}>
                    <span className={s.name}>{item.name}</span>
                  </span>
                  {/* 등락 · 셰브론은 한 묶음 — 셰브론만 다음 줄로 떨어지지 않게 */}
                  <span className={s.end}>
                    {item.changeRate === null ? null : (
                      <span className={`${s.rate} ${rateTone(item.changeRate)}`}>
                        {rateText(item.changeRate)}
                      </span>
                    )}
                    <Chevron />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </MobileSection>
    </>
  );
};
