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
  WatchlistAssetType,
} from "@/entities/market";
import { invalidationToPriceLines, useCoachPanel } from "@/entities/coach";
import { RecordTradeCard } from "@/features/record-transaction";
import { PreflightCard } from "@/features/run-preflight";
import { usePanelHorizonParam } from "@/features/switch-coach-mode";
import { hasApiStatus } from "@repo/web-shared/api";
import { HTTP_STATUS_CODE, PREFLIGHT_ANCHOR_ID } from "@repo/web-shared/config";
import { formatKrwCompact, formatPrice } from "@repo/web-shared/lib";
import { type DetailTab, DetailTabs, SignInRequired } from "@repo/web-shared/ui";
import { detailPanel, detailPanelHead, detailPanelTitle } from "@repo/web-shared/ui/surface.css";

import { useLiveTabIdentity } from "../lib/useLiveTabIdentity";
import { INVESTMENT_DETAIL_BLOCK_MIN_HEIGHT, INVESTMENT_DETAIL_PAGE_MESSAGES as P } from "../model";
import {
  changeText,
  chip,
  code as codeStyle,
  actions,
  head,
  headButton,
  headRow,
  name as nameStyle,
  nameRow,
  noteLine,
  notes,
  price as priceStyle,
  priceRow,
  side,
  stat,
  statLabel,
  stats,
  statValue,
} from "./DetailHead.css";
import { HeaderWatchlistStar } from "./HeaderWatchlistStar";
import { KrEvents } from "./KrEvents";
import { KrInvestorFlows } from "./KrInvestorFlows";
import { KrOrderbook } from "./KrOrderbook";
import { KrScenario } from "./KrScenario";
import { KrStockNews } from "./KrStockNews";
import { RangeBar } from "./RangeBar";
import { StatsMore } from "./StatsMore";
import { tradeCell } from "./KrStockDetail.css";

const won = (value: number | null) => (value === null ? M.priceUnknown : `${formatPrice(value)}원`);
const ratio = (value: number | null, suffix = "") =>
  value === null ? M.priceUnknown : `${value.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}${suffix}`;

/** 정지 줄의 이유 — 서버 칩 순서대로 첫 정지 사유. 칩이 없는데 시각이 왔으면 시장 조치(서버가 그때만 시각을 준다) */
const stopReasonOf = (quote: Pick<KrQuote, "status">) => {
  const badge = quote.status.find((s) => s === "halted" || s === "paused" || s === "vi");
  return badge ? M.detail.stopReasons[badge] : M.detail.stopReasons.market;
};

/**
 * 국내 주식 상세(F011 `FE-REQ-041` FR-42 · 43 · 44 · 46 · `FE-REQ-049`) — **클라이언트 잎.** 국내 시세는 약관상 서버 HTML 에 넣지 않는다
 * (KRX 재배포 약관 — F011 §정책 · 2026-11-10 공개 뒤에도 서버 렌더 · 색인은 `FEATURE-018` OQ2). 머리도 마찬가지.
 *
 * 값은 전부 서버 것이다 — 원 정수 · 전일 대비 · 상하한가 · 기준가 · 호가 단위 · 상태 배지. 거래정지면 마지막 체결 일시를 정지 줄로 쓴다(FR-44).
 *
 * 배치(`FE-REQ-049`, 사용자 결정 2026-11-19 "합치기"):
 * - 머리 2줄(코인과 같은 머리) — 핵심 통계 4칸(거래대금 · 시총 · PER · 외국인) + 범위 막대 1일 · 52주 + [더 보기] 에 나머지
 * - 알약 탭: **개요**(차트 · 한 장 패널 — F017 v4 순서 6 의 4블록 그대로) · 호가 · 투자자 · 소식 · 일정(펼침에 있던 것)
 * - 오른쪽 고정 열 = 내 거래(주문 전 체크 → 거래 기록). 1280 미만이면 탭 "내 거래"
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
  // 핵심 4칸(FR-1) — 나머지는 [더 보기]. 고가 · 저가 · 52주 고저는 범위 막대 양 끝이 말하므로 [더 보기] 에 다시 두지 않는다(같은 숫자 두 번 — `screen-desktop.md` §5).
  // 범위 막대는 값이 없으면 빠진다 — 그때만 [더 보기] 에 남긴다
  const keyStats = [
    { label: M.detail.stats.tradeValue, value: formatKrwCompact(quote.tradeValue) },
    { label: M.detail.stats.marketCap, value: quote.marketCap === null ? M.priceUnknown : formatKrwCompact(quote.marketCap) },
    { label: M.detail.stats.per, value: ratio(detail.per) },
    { label: M.detail.stats.foreignRate, value: ratio(detail.foreignRate, "%") },
  ];
  const dayRange = quote.lowPrice !== null && quote.highPrice !== null;
  const week52Range = detail.week52Low !== null && detail.week52High !== null;
  const moreStats = [
    { label: M.detail.stats.open, value: won(quote.openPrice) },
    ...(dayRange
      ? []
      : [
          { label: M.detail.stats.high, value: won(quote.highPrice) },
          { label: M.detail.stats.low, value: won(quote.lowPrice) },
        ]),
    ...(week52Range
      ? []
      : [
          { label: M.detail.stats.week52High, value: won(detail.week52High) },
          { label: M.detail.stats.week52Low, value: won(detail.week52Low) },
        ]),
    { label: M.detail.stats.basePrice, value: won(quote.basePrice) },
    { label: M.detail.stats.upperLimit, value: won(quote.upperLimit) },
    { label: M.detail.stats.lowerLimit, value: won(quote.lowerLimit) },
    { label: M.detail.stats.volume, value: BigInt(quote.volume).toLocaleString("ko-KR") },
    { label: M.detail.stats.pbr, value: ratio(detail.pbr) },
    { label: P.statTickSize, value: won(detail.tickSize) },
    { label: M.detail.stats.updatedAt, value: updated },
  ];
  const stopLine = quote.lastTradeAt
    ? M.detail.stopped(stopReasonOf(quote), kstClockSeconds(quote.lastTradeAt))
    : quote.isHalted
      ? M.detail.haltedNoTrade
      : null;

  const overview = (
    <>
      <section className={detailPanel} aria-labelledby="kr-chart-heading">
        <div className={detailPanelHead}>
          <h2 id="kr-chart-heading" className={detailPanelTitle}>
            {P.chartHeading}
          </h2>
        </div>
        {/* 차트 위 선은 틀리는 선 하나 — 패널 ④ 줄과 같은 기간 탭(관찰 구간 · 범례는 뺐다, F017 v4 순서 6) */}
        <KrStockChart code={quote.code} displayName={quote.name} priceLines={priceLines} />
      </section>
      {/* 한 장 패널 — 판단 · 왜 움직였나 · 성적 · 해설이 이 안(F017 v4 순서 6) */}
      <KrScenario code={quote.code} />
    </>
  );

  const tabs: DetailTab[] = [{ id: "overview", label: P.tabs.overview, content: overview }];
  // 거래정지면 호가가 없다 — 탭도 없다
  if (!quote.isHalted) {
    tabs.push({
      id: "orderbook",
      label: P.tabs.orderbook,
      content: <KrOrderbook code={quote.code} session={session} basePrice={quote.basePrice} currentPrice={quote.price} />,
    });
  }
  tabs.push(
    { id: "investors", label: P.tabs.investors, content: <KrInvestorFlows code={quote.code} /> },
    {
      id: "news",
      label: P.tabs.newsEvents,
      content: (
        <>
          <KrStockNews code={quote.code} />
          <KrEvents code={quote.code} />
        </>
      ),
    },
  );

  // 내 거래 — 주문 전 체크 → 거래 기록(국내 판단은 기간 탭이 고른 모드)
  const trade = (
    <section className={detailPanel} aria-labelledby="kr-my-trade-heading">
      <div className={detailPanelHead}>
        <h2 id="kr-my-trade-heading" className={detailPanelTitle}>
          {P.tradeHeading}
        </h2>
      </div>
      <SignInRequired what={P.guestWhat.preflight} minHeight={120}>
        <PreflightCard className={tradeCell} symbol={quote.code} mode={preflightMode} livePrice={quote.price} />
      </SignInRequired>
      {/* 현재가는 실시간 구독이 갱신한 값 — [현재가] 버튼이 옮겨 적기만 한다. 호가 단위는 안내만(FR-42) */}
      <SignInRequired what={P.guestWhat.record} minHeight={120}>
        <RecordTradeCard className={tradeCell} symbol={quote.code} assetType="kr_stock" tickSize={detail.tickSize} livePrice={quote.price} />
      </SignInRequired>
    </section>
  );

  return (
    <>
      <header className={head}>
        <div className={headRow}>
          <div className={nameRow}>
            {/* 로고는 서버가 판정한 주소, 없으면 이름 이니셜(FR-47) */}
            <AssetIcon symbol={quote.name} src={quote.logoUrl ?? undefined} name={quote.name} size="sm" />
            <h1 className={nameStyle}>{quote.name}</h1>
            <span className={codeStyle}>{quote.code}</span>
            <span className={chip}>{M.markets[quote.market]}</span>
            <HeaderWatchlistStar symbol={quote.code} displayName={quote.name} assetType={WatchlistAssetType.KrStock} />
            {/* 마지막 체결은 아래 정지 줄이 말한다 — 칩에서 두 번 쓰지 않는다 */}
            <KrQuoteBadges quote={quote} session={session} showLastTrade={false} />
          </div>
          <div className={actions}>
            <StatsMore label={P.statsMore} items={moreStats} />
            {/* 주문 전 체크 — 코인 머리와 같은 해시 링크(FR-131). 카드가 누름을 받아 스크롤 · 포커스 또는 시트, 좁으면 탭이 먼저 열린다 */}
            <a href={`#${PREFLIGHT_ANCHOR_ID}`} className={headButton}>
              <ShieldCheck size={16} aria-hidden="true" />
              {P.preflight}
            </a>
          </div>
        </div>
        <div className={headRow}>
          <div className={priceRow}>
            <span className={priceStyle}>{`${formatPrice(quote.price)}원`}</span>
            <span className={changeText}>
              <KrChangeText rate={quote.changeRate} amount={quote.change} />
            </span>
            <KrSessionLine session={session} />
          </div>
          <div className={side}>
            {dayRange && quote.lowPrice !== null && quote.highPrice !== null && (
              <RangeBar
                label={P.statDayRange}
                low={quote.lowPrice}
                high={quote.highPrice}
                current={quote.price}
                srText={P.rangeSr(P.statDayRange, formatPrice(quote.lowPrice), formatPrice(quote.highPrice))}
              />
            )}
            {week52Range && detail.week52Low !== null && detail.week52High !== null && (
              <RangeBar
                label={P.statWeek52Range}
                low={detail.week52Low}
                high={detail.week52High}
                current={quote.price}
                srText={P.rangeSr(P.statWeek52Range, formatPrice(detail.week52Low), formatPrice(detail.week52High))}
              />
            )}
            <dl className={stats}>
              {keyStats.map((item) => (
                <div key={item.label} className={stat}>
                  <dt className={statLabel}>{item.label}</dt>
                  <dd className={statValue}>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </header>
      {/* 덧줄 — 시간외 단일가(정규장 현재가와 섞지 않는다) · 시장 조치 띠 · 정지 줄. 있을 때만 */}
      {(quote.afterHours || ok.marketActions.length > 0 || stopLine) && (
        <div className={notes}>
          {quote.afterHours && (
            <p className={noteLine}>
              {`${M.afterHours.label} ${formatPrice(quote.afterHours.price)}원 `}
              <KrChangeText rate={quote.afterHours.changeRate} amount={quote.afterHours.change} strong />
              {` · ${M.afterHours.asOf(kstClock(quote.afterHours.at))}`}
            </p>
          )}
          <KrMarketActionBanner actions={ok.marketActions} />
          {stopLine && <StatusLine kind="blocked">{stopLine}</StatusLine>}
        </div>
      )}
      <DetailTabs label={P.tabsLabel} tabs={tabs} aside={{ id: "trade", label: P.tabs.trade, content: trade }} />
    </>
  );
};

export default KrStockDetail;
