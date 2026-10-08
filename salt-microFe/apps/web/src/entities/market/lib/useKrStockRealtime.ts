"use client";

import type { KrOverview, KrQuote, KrResult, KrStockDetail } from "@repo/core/marketKr";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { type PriceUpdate, wsClient } from "@/shared/api";

import type { KrOverviewQuery } from "../api/endpoints";
import { marketQueryKeys } from "../api/queryKeys";
import { krOverviewKey } from "../api/useKrStockQueries";

/**
 * 국내 주식 체결을 받아 프레임당 한 번 넘긴다(F011 `FE-REQ-041`). BFF 가 이미 500ms 로 묶어 보내지만(`BFF-REQ-040` FR-7)
 * 묶음 안의 여러 종목을 한 번에 반영해야 표가 종목 수만큼 다시 그려지지 않는다.
 *
 * 돌려주는 값은 **거부 코드**다 — 비소유자 · 키 없음 · 토큰 만료면 BFF 가 `error` 를 보내고 중계를 멈춘다. 화면은 실시간 점을
 * 끄고 1분 조회(`useKrOverview`)에 기댄다. 코드가 바뀌면(구독 종목이 바뀌면) 다시 시도한다.
 */
const useKrTicks = (codes: string[], apply: (ticks: Map<string, PriceUpdate>) => void): string | null => {
  const [refused, setRefused] = useState<string | null>(null);
  const codesKey = codes.join(",");
  // 최신 `apply` 를 부른다 — 필터를 바꾸면 종목이 같아도 고칠 캐시 키가 바뀐다. 구독은 종목이 바뀔 때만 다시 연다
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    if (!codesKey) return;
    setRefused(null);
    const pending = new Map<string, PriceUpdate>();
    let frameId: number | null = null;

    const unsubscribe = wsClient.subscribeKrPrices(
      codesKey.split(","),
      (tick) => {
        pending.set(tick.symbol, tick);
        if (frameId !== null) return;
        frameId = requestAnimationFrame(() => {
          frameId = null;
          applyRef.current(new Map(pending));
          pending.clear();
        });
      },
      setRefused,
    );
    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      unsubscribe();
    };
  }, [codesKey]);

  return refused;
};

/** 체결 → 시세 한 줄. 등락 · 금액은 서버(KIS) 값을 옮긴다 — 계산하지 않는다 */
const patchQuote = (quote: KrQuote, tick: PriceUpdate | undefined): KrQuote =>
  tick
    ? {
        ...quote,
        price: tick.currentPrice,
        changeRate: tick.change24h,
        change: tick.change24hAmount ?? quote.change,
        priceUpdatedAt: tick.timestamp,
      }
    : quote;

/**
 * 국내 주식 표 — 보이는 코드만 구독하고 `useKrOverview` 캐시를 고친다. 등락률이 바뀐 종목은 `onBlink` 로 알린다 — 코인 표
 * (`useMarketOverviewRealtime`)와 같은 깜빡임이다(등락률 칸만, 가격 칸은 깜빡이지 않는다 — `motion.md` §5).
 *
 * ## 깜빡임은 프레임마다 한 종목씩 흘린다
 *
 * 표는 "지금 깜빡이는 종목 하나"를 상태로 든다(`RealtimeMarketTable` `blinkingSymbol`, 변경 금지 목록). 코인 체결은 종목마다
 * 따로 와서 프레임마다 다른 행이 깜빡인다. 국내 주식은 BFF 가 500ms 묶음으로 보내므로(`BFF-REQ-040` FR-7) 한 프레임에 여러
 * 종목을 넘기면 마지막 하나만 남는다 — 6초에 9번만 깜빡였다(코인 43번, 2026-10-08 실측). 묶음 안의 종목을 다음 묶음까지
 * 하나씩 넘겨 코인과 같은 빈도로 만든다. 간격은 코인 체결이 표에 닿는 간격(중앙값 약 50ms)에 맞췄다 — 매 프레임(16ms)이면
 * 한 행이 23ms 만에 다음 행에 넘어가 거의 안 보였다. 가격 · 등락률 값은 묶음 그대로 한 번에 고친다.
 */
/** 깜빡임 차례 간격 — 코인 표의 깜빡임 유지 시간 중앙값(49ms, 2026-10-08 실측)과 맞춘다 */
const BLINK_SPACING_MS = 50;

export const useKrOverviewRealtime = (
  query: KrOverviewQuery,
  codes: string[],
  onBlink?: (code: string) => void,
): string | null => {
  const queryClient = useQueryClient();
  const key = krOverviewKey(query);
  const blinkQueue = useRef<string[]>([]);
  const onBlinkRef = useRef(onBlink);
  onBlinkRef.current = onBlink;

  const active = codes.length > 0;
  useEffect(() => {
    // 코인 탭에서도 이 훅이 불린다(종목 비움) — 그땐 프레임 루프를 돌리지 않는다
    if (!active) return undefined;
    let frameId = 0;
    let last = 0;
    const drain = (now: number) => {
      if (now - last >= BLINK_SPACING_MS) {
        const code = blinkQueue.current.shift();
        if (code) {
          onBlinkRef.current?.(code);
          last = now;
        }
      }
      frameId = requestAnimationFrame(drain);
    };
    frameId = requestAnimationFrame(drain);
    return () => {
      cancelAnimationFrame(frameId);
      blinkQueue.current = [];
    };
  }, [active]);

  return useKrTicks(codes, (ticks) => {
    const prev = queryClient.getQueryData<KrResult<KrOverview>>(key);
    if (prev?.status !== "ok") return;
    // 새 묶음이 오면 남은 차례는 버린다 — 지난 묶음의 깜빡임이 밀려 늦게 나오지 않게
    blinkQueue.current = prev.items
      .filter((item) => {
        const tick = ticks.get(item.code);
        return tick !== undefined && tick.change24h !== item.changeRate;
      })
      .map((item) => item.code);
    queryClient.setQueryData<KrResult<KrOverview>>(key, {
      ...prev,
      items: prev.items.map((item) => patchQuote(item, ticks.get(item.code))),
    });
  });
};

/** 국내 주식 상세 머리 — `useKrDetail` 캐시를 고친다 */
export const useKrDetailRealtime = (code: string, enabled: boolean): string | null => {
  const queryClient = useQueryClient();
  return useKrTicks(enabled ? [code] : [], (ticks) => {
    queryClient.setQueryData<KrResult<KrStockDetail>>([...marketQueryKeys.krDetail, code], (prev) =>
      prev?.status === "ok" ? { ...prev, quote: patchQuote(prev.quote, ticks.get(prev.quote.code)) } : prev,
    );
  });
};
