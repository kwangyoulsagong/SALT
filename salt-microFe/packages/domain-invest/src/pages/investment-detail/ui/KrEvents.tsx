"use client";

import { Skeleton } from "@repo/ui/skeleton";

import { EventsCard, useSymbolEvents } from "@/entities/coach";

import { krCoachCard } from "./SymbolHeader.css";

/**
 * 국내 상세의 주요 사건(F008 슬라이스 24, `FE-REQ-046` FR-1 · FR-7) — 금통위 · 물가 · 수출입 · 동시만기 + 미국 거시와
 * 과거 같은 일정 뒤 이 종목의 반응. 코인 상세와 같은 카드(`EventsCard`)다.
 *
 * **소유자만** — 404(소유자 아님)이거나 로그인 전이면 자리 자체를 그리지 않는다(코인과 같다). 불러오는 동안은 줄 다섯 칸의
 * 스켈레톤으로 자리를 잡는다 — 카드가 늦게 와도 위 칸이 움직이지 않는다(가장 아래 칸이라 아래로만 늘어난다)
 */
export const KrEvents = ({ code }: { code: string }) => {
  const events = useSymbolEvents(code);
  if (events.isSignedOut || events.notOwner) return null;
  if (events.isPending) {
    return (
      <section className={krCoachCard} aria-busy="true">
        <Skeleton width={120} height={20} />
        <Skeleton lines={5} height={18} />
      </section>
    );
  }
  // 그 밖의 오류는 카드가 "지금 불러올 수 없어요" 한 줄로 그린다
  return <EventsCard className={krCoachCard} result={events.data ?? { status: "unavailable" }} />;
};
