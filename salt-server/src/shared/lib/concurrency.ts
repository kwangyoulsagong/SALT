/**
 * 동시 실행 상한이 있는 map — 결과 순서는 입력 순서다.
 *
 * 외부 호출을 하나씩 기다리면 **응답 지연 × 건수**가 그대로 걸린다(KIS 현재가 50종목이 순차로 38초,
 * 2026-10-07 실측). `Promise.all` 로 다 던지면 상한이 없다(`performance.md`). 출발 간격은 페이서가 지키고,
 * 이 함수는 동시에 매달린 요청 수만 묶는다.
 */
export const mapConcurrent = async <T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, lane));
  return results;
};
