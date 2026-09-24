"use client";

import { useEffect, useState } from "react";

import type { PriceUpdate } from "./types";
import { wsClient } from "./wsClient";

/** 한 값을 움직이는 데 초당 수십 번은 필요 없다 — 눈이 따라가는 속도로 묶는다 */
const LIVE_PRICE_THROTTLE_MS = 500;

/**
 * 한 종목의 실시간 시세 — WS 값을 그대로 옮긴다(계산하지 않는다). 아직 오지 않았으면 `null`.
 *
 * 마지막 값만 남기고 500ms 에 한 번 state 를 고친다(`performance-frontend.md` §2 throttle).
 * 빈 심볼이면 구독하지 않는다 — 부르는 쪽이 조건부로 끌 수 있다.
 *
 * `shared/api` 에 두는 이유: 서버 컴포넌트 머리의 가격 잎도 쓴다. `entities/market` 배럴을 거치면
 * 미리보기 · 차트 로더가 첫 로드에 딸려 온다(`performance-frontend.md` §7).
 */
export const useLivePrice = (symbol: string): PriceUpdate | null => {
  const [update, setUpdate] = useState<PriceUpdate | null>(null);

  useEffect(() => {
    setUpdate(null);
    if (!symbol) return undefined;
    let latest: PriceUpdate | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = wsClient.subscribePrices([symbol], (data) => {
      latest = data;
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        setUpdate(latest);
      }, LIVE_PRICE_THROTTLE_MS);
    });

    return () => {
      if (timer !== null) clearTimeout(timer);
      unsubscribe();
    };
  }, [symbol]);

  return update;
};
