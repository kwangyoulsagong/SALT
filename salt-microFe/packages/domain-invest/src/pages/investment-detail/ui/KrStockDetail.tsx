"use client";

import { type KrQuote, kstClock, kstClockSeconds, kstMonthDay } from "@repo/core/marketKr";
import { AssetIcon } from "@repo/ui/assetIcon";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";
import { ShieldCheck } from "lucide-react";
import { useMemo } from "react";

import {
  KR_STOCK_MESSAGES as M,
  KrChangeText,
  KrMarketActionBanner,
  KrQuoteBadges,
  KrSessionLine,
  KrStockChart,
  useKrDetail,
  useKrDetailRealtime,
} from "@/entities/market";
import { invalidationToPriceLines, useCoachPanel } from "@/entities/coach";
import { RecordTradeCard } from "@/features/record-transaction";
import { PreflightCard } from "@/features/run-preflight";
import { usePanelHorizonParam } from "@/features/switch-coach-mode";

import { KrEvents } from "./KrEvents";
import { KrScenario } from "./KrScenario";
import { KrInvestorFlows } from "./KrInvestorFlows";
import { KrOrderbook } from "./KrOrderbook";
import { KrStockNews } from "./KrStockNews";
import { useLiveTabIdentity } from "../lib/useLiveTabIdentity";
import { hasApiStatus } from "@repo/web-shared/api";
import { SignInRequired } from "@repo/web-shared/ui";
import { HTTP_STATUS_CODE, PREFLIGHT_ANCHOR_ID } from "@repo/web-shared/config";
import { formatKrwCompact, formatPrice } from "@repo/web-shared/lib";

import { INVESTMENT_DETAIL_BLOCK_MIN_HEIGHT, INVESTMENT_DETAIL_PAGE_MESSAGES } from "../model";
import {
  afterHoursLine,
  headerCard,
  identity,
  krArea,
  krBlockTitle,
  krGrid,
  krMoreBody,
  krMoreHint,
  krMoreSummary,
  krSideCard,
  krTradeCell,
  name as nameStyle,
  nameRow,
  preflightLink,
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

/** 정지 줄의 이유 — 서버 칩 순서대로 첫 정지 사유. 칩이 없는데 시각이 왔으면 시장 조치(서버가 그때만 시각을 준다) */
const stopReasonOf = (quote: Pick<KrQuote, "status">) => {
  const badge = quote.status.find((s) => s === "halted" || s === "paused" || s === "vi");
  return badge ? M.detail.stopReasons[badge] : M.detail.stopReasons.market;
};

/**
 * 국내 주식 상세(F011 `FE-REQ-041` FR-42 · 43 · 44 · 46) — **클라이언트 잎.** 코인 상세와 달리 머리를 서버에서 그리지 않는다:
 * ~~시세가 소유자 전용이라~~(2026-11-10 공개 — `ADR-011`) 클라이언트 조회 그대로 — 서버 렌더 · 색인은 `FEATURE-018` OQ2(색인이 필요할 때)
 * (KRX 재배포 약관 — F011 §정책).
 * (2026-11-05 정정: 토큰은 이제 httpOnly 쿠키라 서버도 읽는다 — `FE-REQ-013` FR-80 2단계. 그래도 국내 시세는 약관상 서버 HTML 에 넣지 않으므로 클라이언트에 남는다 — FR-81 대상 아님)
 *
 * 값은 전부 서버 것이다 — 원 정수 · 전일 대비 · 상하한가 · 기준가 · 호가 단위 · 상태 배지. 거래정지면 가격 자리에 마지막 체결
 * 일시를 같이 쓴다(FR-44). 거래 기록은 코인과 같은 폼 — 계획 · 크기 계산까지(슬라이스 4).
 * **4블록 + 펼침**(F017 v4 순서 6 · `FE-REQ-064` FR-12): 가격 줄(머리) · 차트(틀리는 선) · 한 장 패널(`KrScenario` — 판단 · 왜 움직였나 · 성적 · 해설) ·
 * 내 거래(주문 전 체크 · 거래 기록). 호가 · 투자자별 수급 · 소식 목록 · 일정은 펼침. 판단 카드 · 왜 움직였나 카드는 화면에서 뺐다(계산은 서버에 남는다).
 */
export const KrStockDetail = ({ code }: { code: string }) => {
  const { data, isPending, error } = useKrDetail(code);
  const ok = data?.status === "ok" ? data : null;
  // 거래정지 종목은 체결이 없다 — 구독하지 않는다
  useKrDetailRealtime(code, ok !== null && !ok.quote.isHalted);
  // 상세에 있는 동안 브라우저 탭 = 이 종목(`FE-REQ-049` FR-12 · 사용자 2026-11-09) — 실시간 구독이 고친 캐시 값 · 장 밖이면 "장 마감"
  useLiveTabIdentity({
    name: ok?.quote.name ?? null,
    price: ok?.quote.price ?? null,
    changeRate: ok?.quote.changeRate ?? null,
    logoUrl: ok?.quote.logoUrl ?? null,
    closed: ok !== null && ok.session.session !== "regular" && ok.session.session !== "closing_auction",
  });

  // 차트 위 틀리는 선 · 주문 전 체크 모드 — 패널과 같은 쿼리(요청 한 번) · 같은 기간 탭(URL)
  const panel = useCoachPanel(code);
  const [horizon] = usePanelHorizonParam();
  const priceLines = useMemo(
    () => invalidationToPriceLines(panel.data?.scenario.horizons.find((h) => h.horizon === horizon)),
    [panel.data, horizon],
  );
  const preflightMode = panel.data?.horizonMode[horizon] ?? "long_term";

  if (hasApiStatus(error, HTTP_STATUS_CODE.NOT_FOUND)) {
    return <StatusLine kind="empty">{M.detail.notFound}</StatusLine>;
  }
  if (isPending) {
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
            {/* 마지막 체결은 아래 정지 줄이 말한다 — 칩에서 두 번 쓰지 않는다 */}
            <KrQuoteBadges quote={quote} session={session} showLastTrade={false} />
          </div>
          {/* 시간외 단일가(슬라이스 6b) — 정규장 현재가와 섞지 않고 따로 한 줄. 정규장이 열리면 서버가 null 로 준다 */}
          {quote.afterHours && (
            <p className={afterHoursLine}>
              {`${M.afterHours.label} ${formatPrice(quote.afterHours.price)}원 `}
              <KrChangeText rate={quote.afterHours.changeRate} amount={quote.afterHours.change} strong />
              {` · ${M.afterHours.asOf(kstClock(quote.afterHours.at))}`}
            </p>
          )}
          {/* 시장 조치(서킷브레이커 · 사이드카) 띠 — F016 단계 A · FE-REQ-063 FR-2 */}
          <KrMarketActionBanner actions={ok.marketActions} />
          {quote.lastTradeAt ? (
            <StatusLine kind="blocked">
              {M.detail.stopped(stopReasonOf(quote), kstClockSeconds(quote.lastTradeAt))}
            </StatusLine>
          ) : (
            quote.isHalted && <StatusLine kind="blocked">{M.detail.haltedNoTrade}</StatusLine>
          )}
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
          {/* 주문 전 체크 — 코인 머리와 같은 해시 링크(FR-131). 카드가 누름을 받아 스크롤 · 포커스 또는 시트를 연다 */}
          <a href={`#${PREFLIGHT_ANCHOR_ID}`} className={preflightLink}>
            <ShieldCheck size={16} aria-hidden="true" />
            {INVESTMENT_DETAIL_PAGE_MESSAGES.preflight}
          </a>
        </div>
      </header>
      <div className={krGrid}>
        <section className={`${krSideCard} ${krArea.chart}`}>
          {/* 차트 위 선은 틀리는 선 하나 — 패널 ④ 줄과 같은 기간 탭(관찰 구간 · 범례는 뺐다, F017 v4 순서 6) */}
          <KrStockChart code={quote.code} displayName={quote.name} priceLines={priceLines} />
        </section>
        {/* 한 장 패널 — 판단 · 왜 움직였나 · 성적 · 해설이 이 안(F017 v4 순서 6 — 판단 카드 · 왜 움직였나 카드는 화면에서 뺐다) */}
        <div className={krArea.panel}>
          <KrScenario code={quote.code} />
        </div>
        {/* 내 거래 — 주문 전 체크 · 거래 기록을 한 칸으로(국내 판단은 기간 탭이 고른 모드) */}
        <section className={`${krSideCard} ${krArea.trade}`} aria-labelledby="kr-my-trade-heading">
          <h2 id="kr-my-trade-heading" className={krBlockTitle}>
            {INVESTMENT_DETAIL_PAGE_MESSAGES.tradeHeading}
          </h2>
          <SignInRequired what={INVESTMENT_DETAIL_PAGE_MESSAGES.guestWhat.preflight} minHeight={120}>
            <PreflightCard className={krTradeCell} symbol={quote.code} mode={preflightMode} livePrice={quote.price} />
          </SignInRequired>
          {/* 현재가는 실시간 구독이 갱신한 값 — [현재가] 버튼이 옮겨 적기만 한다. 호가 단위는 안내만(FR-42) */}
          <SignInRequired what={INVESTMENT_DETAIL_PAGE_MESSAGES.guestWhat.record} minHeight={120}>
            <RecordTradeCard
              className={krTradeCell}
              symbol={quote.code}
              assetType="kr_stock"
              tickSize={detail.tickSize}
              livePrice={quote.price}
            />
          </SignInRequired>
        </section>
        {/*
          펼침 — 호가 · 투자자별 수급 표 · 소식 목록 · 일정(F017 v4 순서 6 · FR-12 "필요할 때만"). 요점(수급 · 소식)은 패널의 원인 칸이 말한다.
          접힌 동안에도 마운트한다(조회는 그대로) — 펼치는 순간 비어 보이지 않게. 거래정지면 호가가 없다
        */}
        <details className={krArea.more}>
          <summary className={krMoreSummary}>
            {INVESTMENT_DETAIL_PAGE_MESSAGES.krMoreSummary}
            <span className={krMoreHint}>{INVESTMENT_DETAIL_PAGE_MESSAGES.moreHint}</span>
          </summary>
          <div className={krMoreBody}>
            {!quote.isHalted && (
              <KrOrderbook code={quote.code} session={session} basePrice={quote.basePrice} currentPrice={quote.price} />
            )}
            <KrInvestorFlows code={quote.code} />
            <KrStockNews code={quote.code} />
            <KrEvents code={quote.code} />
          </div>
        </details>
      </div>
    </>
  );
};

export default KrStockDetail;
