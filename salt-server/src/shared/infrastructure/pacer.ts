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
 * 출발 자리가 날 때마다 **그 순간** 기다리는 것 중 가장 앞 우선순위(아래 나이 들이기를 더한 마감)를 보낸다 — 간격을 기다리는 동안 들어온
 * 급한 호출이 앞질러 나간다. 우선순위를 주지 않으면 전부 0 이라 예전과 같은 FIFO 다.
 *
 * ## 굶는 요청 0 — 나이 들이기(aging)
 *
 * 처음엔 순수 우선순위였다 — "부르는 쪽이 동시 호출 수를 묶어 두므로 높은 쪽 줄은 회차가 끝나면 빈다"고 봤다. 거짓이었다:
 * 동시 수를 묶어도 **회차가 몇 시간짜리면**(5분봉 1년 백필 2만 호출) 그 동안 줄이 한 번도 비지 않는다. 같은 결함이 두 번 났다 —
 * 전 종목 일봉이 투자자 동향을 굶김(2026-11-16 `17d54c69`), 5분봉 1년 백필이 전 종목 일봉(18:40~18:50 일봉 3회 · 분봉 1,003회)
 * · 시황 제목(17~18시 2분 회차 105번 건너뜀)을 굶김(2026-11-17, `SRV-REQ-057` FR-9). 호출처 우선순위를 고치는 것은 사례 수리다.
 *
 * 그래서 줄에 선 요청마다 **마감 = 선 시각 + 우선순위 × `agingMs`** 를 매기고, 자리가 나면 마감이 가장 이른 것을 보낸다
 * (같으면 먼저 선 것). 같은 순간에 선 요청끼리는 예전과 똑같이 우선순위 순이고, 낮은 우선순위는 한 단계당 `agingMs` 를 더
 * 기다리면 높은 쪽의 새 요청과 같은 줄에 선다 — 높은 쪽이 줄을 영원히 채워도 낮은 쪽 대기는 `(차이) × agingMs` + 앞선 몇 건으로
 * 묶인다. 우선순위를 다 0 으로 쓰는 쪽(Upbit)은 마감 = 선 시각이라 FIFO 그대로다.
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
  /**
   * 우선순위 한 단계의 값(ms) — 낮은 쪽이 이만큼 더 기다리면 한 단계 높은 쪽 새 요청과 같은 자리에 선다. 기본 30초:
   * 화면 폴링 한 회차(57종목 · 약 2건/s ≈ 30초)는 순수 우선순위처럼 앞서고, 몇 시간짜리 백필이 2분마다 도는 수집을
   * 회차째 막지는 못한다
   */
  agingMs?: number;
}

/** `agingMs` 기본 — 위 주석 */
export const DEFAULT_PACER_AGING_MS = 30_000;

interface Waiting {
  /** 선 시각 + 우선순위 × agingMs — 작을수록 먼저 */
  deadline: number;
  /** 같은 마감이면 먼저 선 것 */
  seq: number;
  start: () => void;
}

export const createRatePacer = ({
  perSecond,
  now = Date.now,
  sleep = delay,
  maxInFlight = Number.POSITIVE_INFINITY,
  agingMs = DEFAULT_PACER_AGING_MS,
}: RatePacerOptions): RatePacer => {
  if (!(agingMs > 0 && Number.isFinite(agingMs))) throw new Error(`agingMs 는 양의 유한수여야 한다: ${agingMs}`);
  const intervalMs = 1_000 / perSecond;
  let nextStart = 0;
  let pausedUntil = 0;
  let inFlight = 0;
  let seq = 0;
  /** 대기 줄 — 길이는 부르는 쪽 동시 수의 합이라 수백 건 안쪽이다. 고를 때 한 번 훑는다 */
  const waiting: Waiting[] = [];
  let pumping = false;

  const takeNext = () => {
    let best = 0;
    for (let i = 1; i < waiting.length; i++) {
      const w = waiting[i];
      const b = waiting[best];
      if (w.deadline < b.deadline || (w.deadline === b.deadline && w.seq < b.seq)) best = i;
    }
    return waiting.splice(best, 1)[0].start;
  };

  // 출발 자리를 하나씩 내준다. 고르는 것은 간격을 기다린 **뒤** — 그사이 들어온 급한 호출이 앞선다
  const pump = async () => {
    if (pumping) return;
    pumping = true;
    try {
      // 자리가 다 찼으면 멈춘다 — 끝난 호출이 다시 깨운다(`run` 의 settle)
      while (inFlight < maxInFlight && waiting.length > 0) {
        // 기다린 사이 쉬기가 늘었을 수 있다 — 깨면 다시 잰다
        const wait = Math.max(nextStart, pausedUntil) - now();
        if (wait > 0) {
          await sleep(wait);
          continue;
        }
        const start = takeNext();
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
        // 출발은 동기로 — 출발 시각이 곧 자리를 받은 시각이다. 앞 호출의 실패는 뒤 호출을 막지 않는다
        const settle = () => {
          inFlight--;
          void pump();
        };
        const start = () => {
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
        };
        waiting.push({ deadline: now() + priority * agingMs, seq: seq++, start });
        void pump();
      });
    },
    pauseUntil(at) {
      pausedUntil = Math.max(pausedUntil, at);
    },
  };
};
