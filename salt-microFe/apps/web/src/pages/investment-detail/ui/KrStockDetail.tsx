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
  useKrDetail,
  useKrDetailRealtime,
} from "@/entities/market";
import { RecordTradeCard } from "@/features/record-transaction";

import { KrCoachJudgment } from "./KrCoachJudgment";
import { KrForecast } from "./KrForecast";
import { KrInvestorFlows } from "./KrInvestorFlows";
import { KrOrderbook } from "./KrOrderbook";
import { hasApiStatus, useHasAccessToken } from "@/shared/api";
import { HTTP_STATUS_CODE } from "@/shared/config";
import { formatKrwCompact, formatPrice } from "@/shared/lib";

import { INVESTMENT_DETAIL_BLOCK_MIN_HEIGHT } from "../model";
import {
  afterHoursLine,
  headerCard,
  identity,
  krBody,
  krCell,
  krSideCard,
  krSideColumn,
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
 * 일시를 같이 쓴다(FR-44). 거래 기록은 코인과 같은 폼 — 계획 · 크기 계산까지(슬라이스 4). 코치 판단은 장기 한 모드
 * (`KrCoachJudgment`, 슬라이스 4). 변동 범위는 오른쪽 열 "자세히"(`KrForecast`, 슬라이스 5d — 소유자만). 해설은 아직 열지 않았다.
 */
export const KrStockDetail = ({ code }: { code: string }) => {
  const signedIn = useHasAccessToken();
  const { data, isPending, error } = useKrDetail(code);
  const ok = data?.status === "ok" ? data : null;
  // 거래정지 종목은 체결이 없다 — 구독하지 않는다
  useKrDetailRealtime(code, ok !== null && !ok.quote.isHalted);

  if (signedIn === false) return <StatusLine kind="blocked">{M.signInRequired}</StatusLine>;
  if (hasApiStatus(error, HTTP_STATUS_CODE.NOT_FOUND)) {
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
          {/* 시간외 단일가(슬라이스 6b) — 정규장 현재가와 섞지 않고 따로 한 줄. 정규장이 열리면 서버가 null 로 준다 */}
          {quote.afterHours && (
            <p className={afterHoursLine}>
              {`${M.afterHours.label} ${formatPrice(quote.afterHours.price)}원 `}
              <KrChangeText rate={quote.afterHours.changeRate} amount={quote.afterHours.change} strong />
              {` · ${M.afterHours.asOf(kstClock(quote.afterHours.at))}`}
            </p>
          )}
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
      <div className={krBody}>
        <KrStockChart code={quote.code} displayName={quote.name} />
        <div className={krSideColumn}>
          {/* 코인 상세 오른쪽 열과 같은 순서 — 자세히(변동 범위) → 거래 기록. 차트 선 끝은 실시간 현재가 */}
          <KrForecast code={quote.code} livePrice={quote.price} />
          {/* 현재가는 실시간 구독이 갱신한 값 — [현재가] 버튼이 옮겨 적기만 한다. 호가 단위는 안내만(FR-42) */}
          <RecordTradeCard
            className={krSideCard}
            symbol={quote.code}
            assetType="kr_stock"
            tickSize={detail.tickSize}
            livePrice={quote.price}
          />
        </div>
      </div>
      {/*
        시세 사실 줄 — 투자자별 순매수(슬라이스 6) | 호가 10단계(슬라이스 6b). 위 줄과 같은 격자라 호가가 거래 기록 바로 아래
        같은 폭에 선다. 호가를 오른쪽 열에 넣으면 열이 길어져 차트 아래가 비었다(2026-10-27 1440px 확인). 코치 판단보다 위.
        칸을 div 로 감싸 투자자 표가 자리를 안 그려도 호가가 오른쪽 칸에 남는다. 거래정지면 호가가 없다
      */}
      <div className={krBody}>
        <div className={krCell}>
          <KrInvestorFlows code={quote.code} />
        </div>
        <div className={krCell}>
          {!quote.isHalted && (
            <KrOrderbook code={quote.code} session={session} basePrice={quote.basePrice} currentPrice={quote.price} />
          )}
        </div>
      </div>
      <KrCoachJudgment code={quote.code} />
    </>
  );
};

export default KrStockDetail;
