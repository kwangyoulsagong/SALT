import { setTimeout as delay } from "node:timers/promises";

/**
 * 외부 호출 **출발 간격** 제한 — 초당 `perSecond` 건을 **고르게** 출발시킨다.
 *
 * ## 왜 재시도로는 부족한가
 *
 * `withRetry` 는 429 를 **맞은 뒤에** 다시 건다. 호출하는 쪽이 동시에 수십 건을 던지면
 * 재시도도 같이 몰려서 다시 429 를 맞는다 — 2026-09-18 콜드 스타트에서 Upbit 429 가
 * 985건 쌓였고 그중 2건은 재시도 3회를 다 쓰고 수집에 실패했다(`SRV-REQ-006`
 * 체크리스트 §12). 레이트리밋은 **보내기 전에** 지켜야 0건이 된다.
 *
 * ## 왜 "1초에 N건"이 아니라 "간격"인가
 *
 * 처음에는 1초 창에 8건까지 한꺼번에 내보냈다. 429 가 985 → 27건으로 줄었지만 0이
 * 아니었다 — 창이 열리는 순간 8건이 **동시에** 출발하고, 응답 지연 편차 때문에 거래소
 * 쪽에서는 앞 창의 꼬리와 뒤 창의 머리가 같은 1초로 도착한다. 출발을 `1000 / N` ms
 * 간격으로 펴면 지연 편차가 그 간격보다 커야 몰린다.
 *
 * ## 무엇을 세나
 *
 * 응답 시간이 아니라 **출발 시각**이다. 거래소가 세는 것도 도착한 요청 수다.
 * 재시도도 한 건이다 — 그래서 부르는 쪽은 재시도 **안쪽**에서 `run` 을 쓴다.
 * 출발 순서는 요청 순서다(FIFO).
 */
export interface RatePacer {
  run<T>(operation: () => Promise<T>): Promise<T>;
}

export interface RatePacerOptions {
  /** 초당 출발 건수. 출발 간격은 `1000 / perSecond` ms 다. */
  perSecond: number;
  /** 테스트용 주입. */
  now?: () => number;
  sleep?: (ms: number) => Promise<unknown>;
}

export const createRatePacer = ({
  perSecond,
  now = Date.now,
  sleep = delay,
}: RatePacerOptions): RatePacer => {
  const intervalMs = 1_000 / perSecond;
  let nextStart = 0;
  let tail: Promise<void> = Promise.resolve();

  const acquire = async () => {
    const t = now();
    const startAt = Math.max(t, nextStart);
    nextStart = startAt + intervalMs;
    if (startAt > t) await sleep(startAt - t);
  };

  return {
    run(operation) {
      const slot = tail.then(acquire);
      // 앞 호출의 실패가 뒤 호출의 출발을 막지 않는다 — 줄은 자리만 관리한다
      tail = slot.catch(() => undefined);
      return slot.then(operation);
    },
  };
};
