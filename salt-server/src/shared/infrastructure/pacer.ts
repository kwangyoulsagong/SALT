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
 *
 * ## 출발 순서 — 우선순위, 같은 우선순위는 요청 순서
 *
 * 한도 하나를 여러 작업이 나눠 쓰면 "누가 먼저 나가나" 가 곧 한도가 모자랄 때 누가 밀리나다. 줄이 FIFO 하나면
 * 밤새 도는 일봉 백필 뒤에 보유 종목 시세가 선다(KIS — F011 FR-91). 그래서 `priority`(작을수록 먼저)를 받고,
 * 출발 자리가 날 때마다 **그 순간** 기다리는 것 중 가장 앞 우선순위를 보낸다 — 간격을 기다리는 동안 들어온
 * 급한 호출이 앞질러 나간다. 우선순위를 주지 않으면 전부 0 이라 예전과 같은 FIFO 다.
 *
 * 낮은 우선순위는 높은 쪽이 줄을 비울 때까지 기다린다(굶을 수 있다). 부르는 쪽이 동시 호출 수를 묶어 두므로
 * 높은 쪽 줄은 회차가 끝나면 빈다 — 그래서 나이 들이기(aging)는 두지 않았다.
 */
export interface RatePacer {
  run<T>(operation: () => Promise<T>, priority?: number): Promise<T>;
  /**
   * 이 시각까지 아무것도 출발시키지 않는다 — 상대가 한도 초과를 알렸을 때(KIS EGW00201). 쉬는 동안 줄은 그대로 쌓이고,
   * 끝나면 **간격대로** 다시 나간다. 예전엔 쉬기를 출발한 호출 안에서 했다 — 페이서는 그동안에도 자리를 내줘
   * 쉬기가 끝나는 순간 줄 전체가 한꺼번에 나가 다시 초과했다(2026-11-11, `SRV-REQ-057` FR-3)
   */
  pauseUntil(at: number): void;
}

export interface RatePacerOptions {
  /** 초당 출발 건수. 출발 간격은 `1000 / perSecond` ms 다. */
  perSecond: number;
  /** 테스트용 주입. */
  now?: () => number;
  sleep?: (ms: number) => Promise<unknown>;
  /**
   * 동시에 응답을 기다리는 호출 상한 — 없으면 무제한(출발 간격만 지킨다). 상대가 출발 수가 아니라 **동시 처리 수**로 막을 때
   * (KIS 모의: 출발 0.54건/s 인데도 EGW00201 6.5%, 2026-11-11 `SRV-REQ-057` FR-3)
   */
  maxInFlight?: number;
}

export const createRatePacer = ({
  perSecond,
  now = Date.now,
  sleep = delay,
  maxInFlight = Number.POSITIVE_INFINITY,
}: RatePacerOptions): RatePacer => {
  const intervalMs = 1_000 / perSecond;
  let nextStart = 0;
  let pausedUntil = 0;
  let inFlight = 0;
  /** 우선순위별 대기 줄 — 출발시키는 함수만 담는다 */
  const queues = new Map<number, Array<() => void>>();
  let pumping = false;

  const takeNext = () => {
    let best: number | null = null;
    for (const [priority, queue] of queues) {
      if (queue.length > 0 && (best === null || priority < best)) best = priority;
    }
    return best === null ? null : queues.get(best)!.shift()!;
  };

  // 출발 자리를 하나씩 내준다. 고르는 것은 간격을 기다린 **뒤** — 그사이 들어온 급한 호출이 앞선다
  const pump = async () => {
    if (pumping) return;
    pumping = true;
    try {
      // 자리가 다 찼으면 멈춘다 — 끝난 호출이 다시 깨운다(`run` 의 settle)
      while (inFlight < maxInFlight && [...queues.values()].some((queue) => queue.length > 0)) {
        // 기다린 사이 쉬기가 늘었을 수 있다 — 깨면 다시 잰다
        const wait = Math.max(nextStart, pausedUntil) - now();
        if (wait > 0) {
          await sleep(wait);
          continue;
        }
        const start = takeNext()!;
        nextStart = Math.max(now(), nextStart) + intervalMs;
        start();
      }
    } finally {
      pumping = false;
    }
  };

  return {
    run(operation, priority = 0) {
      return new Promise((resolve, reject) => {
        const queue = queues.get(priority) ?? [];
        queues.set(priority, queue);
        // 출발은 동기로 — 출발 시각이 곧 자리를 받은 시각이다. 앞 호출의 실패는 뒤 호출을 막지 않는다
        const settle = () => {
          inFlight--;
          void pump();
        };
        queue.push(() => {
          inFlight++;
          try {
            operation().then(
              (value) => {
                settle();
                resolve(value);
              },
              (error) => {
                settle();
                reject(error);
              }
            );
          } catch (error) {
            settle();
            reject(error);
          }
        });
        void pump();
      });
    },
    pauseUntil(at) {
      pausedUntil = Math.max(pausedUntil, at);
    },
  };
};
