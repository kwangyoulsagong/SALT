import { setTimeout as delay } from "node:timers/promises";

/**
 * 외부 호출 재시도 — **지수 백오프, 상한 3회** (`ddd-infrastructure.md` §6).
 *
 * ## 왜 `httpClient` 안이 아니라 별도인가
 *
 * `httpClient` 는 타임아웃 **기본값**을 주는 팩토리이고 재시도를 넣지 않았다 —
 * "유스케이스마다 재시도 가능 여부가 다르다"가 그 파일에 적힌 이유다. 그 판단은
 * 여전히 맞다. 다만 **재시도해도 되는 호출**(조회 전용 GET)이 실제로 생겼고,
 * 그때마다 백오프를 다시 쓰면 대기 시간이 파일마다 달라진다.
 *
 * 그래서 정책은 여기 한 곳에 두고 **부르는 쪽이 쓸지 말지를 고른다.**
 *
 * ## 무엇을 재시도하면 안 되나
 *
 * **쓰기는 이 함수를 쓰지 않는다.** 같은 요청이 두 번 도착해도 안전한 호출
 * (조회 전용 GET)에만 쓴다. 그리고 이 제품에는 주문·출금 호출이 **없으므로**
 * 재시도가 주문을 두 번 넣는 사고가 성립하지 않는다.
 */

export interface RetryOptions {
  /** 최초 호출 이후 **재시도 횟수**. 상한 3 이고 기본 3 이다. */
  retries?: number;
  /** 첫 재시도까지 대기. 이후 2배씩 늘어난다. */
  baseDelayMs?: number;
  /** 재시도할 오류인지. 기본은 전부 재시도한다. */
  isRetryable?: (error: unknown) => boolean;
  /** 재시도 직전에 부른다. 로깅에 쓴다 — 여기서 던지지 않는다. */
  onRetry?: (error: unknown, attempt: number, waitMs: number) => void;
}

const MAX_RETRIES = 3;

export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const retries = Math.min(options.retries ?? MAX_RETRIES, MAX_RETRIES);
  const baseDelayMs = options.baseDelayMs ?? 500;
  const isRetryable = options.isRetryable ?? (() => true);

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // 마지막 시도였거나 재시도할 성격이 아니면 그대로 올린다 —
      // **삼키지 않는다.** 실패를 늦게 알리는 것이 재시도의 대가다.
      if (attempt === retries || !isRetryable(error)) throw error;

      const waitMs = baseDelayMs * 2 ** attempt;
      options.onRetry?.(error, attempt + 1, waitMs);
      await delay(waitMs);
    }
  }

  throw lastError;
};

/**
 * HTTP 에서 **다시 걸면 될 법한** 실패인가.
 *
 * 429(레이트리밋)와 5xx, 그리고 응답이 아예 없는 경우(타임아웃·네트워크)만 참이다.
 * 4xx 는 요청이 잘못된 것이라 몇 번을 걸어도 같은 답이 온다.
 */
export const isRetryableHttpError = (error: unknown): boolean => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === undefined) return true;
  return status === 429 || status >= 500;
};
