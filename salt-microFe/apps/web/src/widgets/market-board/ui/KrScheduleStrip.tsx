"use client";

import { KrScheduleLine, KrScheduleLinePlaceholder, useKrSchedule } from "@/entities/market";

/** 가장 가까운 몇 건만 — 한 줄이 넘치지 않는 수(`FE-REQ-046` FR-5) */
const KR_SCHEDULE_VISIBLE = 3;

/**
 * 국내 탭 "다가오는 일정" 한 줄(F008 슬라이스 24, `FE-REQ-046` FR-5 · FR-6) — 지수 띠 아래.
 *
 * 일정은 공개 사실이라 로그인 사용자 전부에게 같다(분포 · 판정 없음). 부가 정보라 지수 띠와 같은 규칙 — 실패 · `unavailable` ·
 * 0건이면 **줄을 숨긴다**(빈 줄 금지). 불러오는 동안은 줄 높이만큼 자리를 잡는다
 */
export const KrScheduleStrip = () => {
  const { data, isPending } = useKrSchedule();
  if (isPending) return <KrScheduleLinePlaceholder />;
  if (data?.status !== "ok" || data.items.length === 0) return null;
  return <KrScheduleLine items={data.items} limit={KR_SCHEDULE_VISIBLE} />;
};

export default KrScheduleStrip;
