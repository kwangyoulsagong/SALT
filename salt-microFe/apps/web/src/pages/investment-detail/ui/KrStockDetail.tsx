"use client";

import { kstClock, kstMonthDay } from "@repo/core/marketKr";
import { AssetIcon } from "@repo/ui/assetIcon";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";

import {
  KR_STOCK_MESSAGES as M,
  KrChangeText,
  KrQuoteBadges,
  KrSessionLine,
  KrStockChart,
  MarketApiError,
  useKrDetail,
  useKrDetailRealtime,
} from "@/entities/market";
import { useHasAccessToken } from "@/shared/api";
import { formatKrwCompact, formatPrice } from "@/shared/lib";

import { INVESTMENT_DETAIL_BLOCK_MIN_HEIGHT } from "../model";
import {
  headerCard,
  identity,
  name as nameStyle,
  nameRow,
  price as priceStyle,
  priceRow,
  stat,
  statLabel,
  stats,
  statsRow,
  statValue,
  ticker,
} from "./SymbolHeader.css";

const won = (value: number | null) => (value === null ? M.priceUnknown : `${formatPrice(value)}원`);
const ratio = (value: number | null, suffix = "") =>
  value === null ? M.priceUnknown : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}${suffix}`;

/**
 * 국내 주식 상세(F011 `FE-REQ-041` FR-42 · 43 · 44 · 46) — **클라이언트 잎.** 코인 상세와 달리 머리를 서버에서 그리지 않는다:
 * 시세가 소유자 전용이라 토큰이 필요하고(브라우저 `localStorage`), 공개 HTML · 메타데이터에 국내 주식 시세를 넣으면 안 된다
 * (KRX 재배포 약관 — F011 §정책).
 *
 * 값은 전부 서버 것이다 — 원 정수 · 전일 대비 · 상하한가 · 기준가 · 호가 단위 · 상태 배지. 거래정지면 가격 자리에 마지막 체결
 * 일시를 같이 쓴다(FR-44). 코치 판단 · 해설 · 거래 기록은 아직 국내 주식을 받지 않는다(슬라이스 3b · 4).
 */
export const KrStockDetail = ({ code }: { code: string }) => {
  const signedIn = useHasAccessToken();
  const { data, isPending, error } = useKrDetail(code);
  const ok = data?.status === "ok" ? data : null;
  // 거래정지 종목은 체결이 없다 — 구독하지 않는다
  useKrDetailRealtime(code, ok !== null && !ok.quote.isHalted);

  if (signedIn === false) return <StatusLine kind="blocked">{M.signInRequired}</StatusLine>;
  if (error instanceof MarketApiError && error.status === 404) {
    return <StatusLine kind="empty">{M.detail.notFound}</StatusLine>;
  }
  if (isPending || signedIn === null) {
    return <Skeleton height={INVESTMENT_DETAIL_BLOCK_MIN_HEIGHT} radius="base" />;
  }
  if (!ok) {
    return <StatusLine kind="error">{data?.status === "disabled" ? M.detail.notFound : M.unavailable}</StatusLine>;
  }

  const { quote, detail, session } = ok;
  const updated = `${kstMonthDay(quote.priceUpdatedAt)} ${kstClock(quote.priceUpdatedAt)}`;
  const statItems: { label: string; value: string }[] = [
    { label: M.detail.stats.open, value: won(quote.openPrice) },
    { label: M.detail.stats.high, value: won(quote.highPrice) },
    { label: M.detail.stats.low, value: won(quote.lowPrice) },
    { label: M.detail.stats.basePrice, value: won(quote.basePrice) },
    { label: M.detail.stats.upperLimit, value: won(quote.upperLimit) },
    { label: M.detail.stats.lowerLimit, value: won(quote.lowerLimit) },
    { label: M.detail.stats.tradeValue, value: formatKrwCompact(quote.tradeValue) },
    { label: M.detail.stats.volume, value: BigInt(quote.volume).toLocaleString("ko-KR") },
    { label: M.detail.stats.marketCap, value: quote.marketCap === null ? M.priceUnknown : formatKrwCompact(quote.marketCap) },
    { label: M.detail.stats.week52High, value: won(detail.week52High) },
    { label: M.detail.stats.week52Low, value: won(detail.week52Low) },
    { label: M.detail.stats.per, value: ratio(detail.per) },
    { label: M.detail.stats.pbr, value: ratio(detail.pbr) },
    { label: M.detail.stats.foreignRate, value: ratio(detail.foreignRate, "%") },
    { label: M.detail.stats.updatedAt, value: updated },
  ];

  return (
    <>
      <header className={headerCard}>
        <div className={identity}>
          <div className={nameRow}>
            {/* 로고는 서버가 판정한 logo.dev 주소, 없으면 이름 이니셜(FR-47) */}
            <AssetIcon symbol={quote.name} src={quote.logoUrl ?? undefined} name={quote.name} size="md" />
            <h1 className={nameStyle}>{quote.name}</h1>
            <span className={ticker}>
              {quote.code} · {M.markets[quote.market]}
            </span>
          </div>
          <div className={priceRow}>
            <span className={priceStyle}>{`${formatPrice(quote.price)}원`}</span>
            <KrChangeText rate={quote.changeRate} amount={quote.change} />
            <KrQuoteBadges quote={quote} session={session} />
          </div>
          {quote.isHalted && <StatusLine kind="blocked">{M.detail.halted(updated)}</StatusLine>}
          <KrSessionLine session={session} />
          <p className={statLabel}>{M.detail.tickSize(formatPrice(detail.tickSize))}</p>
        </div>
        <div className={statsRow}>
          <dl className={stats}>
            {statItems.map((item) => (
              <div key={item.label} className={stat}>
                <dt className={statLabel}>{item.label}</dt>
                <dd className={statValue}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>
      <KrStockChart code={quote.code} displayName={quote.name} />
      <StatusLine kind="empty">{M.detail.noCoach}</StatusLine>
    </>
  );
};

export default KrStockDetail;
