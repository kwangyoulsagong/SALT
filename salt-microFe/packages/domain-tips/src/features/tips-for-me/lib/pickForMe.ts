import type { TipForMe } from "@/entities/tip";

/** 맥락 하나의 조회 결과 — React Query 결과에서 필요한 칸만(시험이 쿼리 없이 경계를 본다) */
export interface ForMeResult {
  data?: TipForMe;
  isError: boolean;
}

export interface ForMePick<C extends string> {
  context: C;
  tip: NonNullable<TipForMe["tip"]>;
}

/**
 * 맥락별 결과 → 사이드에 그릴 행 · 실패 여부(`FE-REQ-060` FR-10 · FR-13). 계산이 아니라 **표시 판정**만 한다 — 무엇을 고를지는 서버다.
 *
 * - 같은 글이 두 맥락에 걸리면 앞 맥락 하나로(같은 행 두 번 금지)
 * - 고른 행이 하나라도 있으면 그린다 — 다른 맥락이 실패해도 행을 가리지 않는다(부분 실패 격리)
 * - 행이 없을 때, 한 맥락이라도 실패했거나 서버 칸이 `degraded` 면 "없어요"라고 말할 수 없다 → 실패 한 줄
 */
export const pickForMe = <C extends string>(contexts: readonly C[], results: readonly ForMeResult[]) => {
  const seen = new Set<string>();
  const picks: ForMePick<C>[] = [];
  contexts.forEach((context, index) => {
    const tip = results[index]?.data?.tip;
    if (!tip || seen.has(tip.slug)) return;
    seen.add(tip.slug);
    picks.push({ context, tip });
  });
  const unsure = results.some((r) => r.isError || r.data?.degraded === true);
  return { picks, isError: picks.length === 0 && unsure };
};
