/**
 * BFF 호출 실패의 **한 가지 모양** — `{ status, code, retriable }` (`FE-REQ-012` FR-41).
 *
 * ## 왜 한 곳인가
 *
 * 전에는 슬라이스마다 에러 클래스가 하나씩 있었다(`CoachApiError` · `MarketApiError` · `GoalApiError` …
 * 9개). 모양이 제각각이라 "4xx 면 다시 부르지 않는다"를 훅마다 다시 적었고(코치 훅 10곳), 전역 기본값은
 * 4xx 도 두 번 더 불렀다 — 모르는 종목 404 가 백오프 3초 뒤에야 "없는 종목"으로 보였다.
 *
 * ## 여기 없는 것
 *
 * - **문장.** 서버 `message` 는 읽지 않는다(FR-42 · FR-44) — 화면은 `code` 로 자기 문구를 고른다
 * - 도메인 사유(초대 거부 `reasonCode`)는 그 기능이 따로 든다 — `shared` 는 도메인을 모른다
 */
import { HTTP_STATUS_CODE } from "@/shared/config";

const REQUEST_TIMEOUT = 408;

/**
 * 다시 보내면 달라질 수 있는 실패만 `true` — 5xx · 408.
 *
 * 429 는 `false` 다. 다시 부를 시각은 서버가 정했고(`Retry-After`), 백오프 1초로 다시 부르면 쿨다운을
 * 한 번 더 맞는다. 쿨다운을 결과로 다루는 곳(`regenerate-coach`)은 따로 읽는다.
 */
const isRetriableStatus = (status: number): boolean =>
  status >= HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR || status === REQUEST_TIMEOUT;

export class ApiError extends Error {
  readonly status: number;
  /** BFF 봉투의 `code`(`MARKET_SYMBOL_NOT_FOUND` 등). 없으면 `null` — 문자열 아닌 값은 버린다 */
  readonly code: string | null;
  readonly retriable: boolean;

  /** `label` 은 로그용(어느 호출인가)이다. 화면에 내지 않는다 */
  constructor(label: string, status: number, code: string | null = null) {
    super(`${label} ${status}${code ? ` ${code}` : ""}`);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retriable = isRetriableStatus(status);
  }
}

/**
 * 실패 응답 → `ApiError`. 본문을 읽으므로 **응답당 한 번만** 부른다.
 *
 * 본문이 JSON 이 아니면(프록시 HTML · 빈 본문) `code` 없이 만든다 — 실패를 실패로 두는 것이 먼저다.
 */
export const readApiError = async (response: Response, label: string): Promise<ApiError> => {
  const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : null;
  return new ApiError(label, response.status, code);
};

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

/** 상태 하나로 가르는 곳(404 = 소유자 아님 · 429 = 잠시 후)이 쓴다 */
export const hasApiStatus = (error: unknown, status: number): boolean =>
  isApiError(error) && error.status === status;

/** 4xx — 다시 불러도 같다. 주기 조회(`refetchInterval`)를 멈출 때 쓴다 */
export const isClientApiError = (error: unknown): boolean =>
  isApiError(error) &&
  error.status >= HTTP_STATUS_CODE.BAD_REQUEST &&
  error.status < HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR;

/**
 * 다시 부를 만한가. `ApiError` 는 `retriable` 그대로.
 *
 * 그 밖의 예외 중 `TypeError` 는 다시 부르지 않는다 — `fetch` 의 연결 실패도 `TypeError` 지만 코드 버그
 * (`undefined` 읽기)도 `TypeError` 라 가를 수 없고, 전역 기본값이 원래 그렇게 정했다. 나머지(본문 파싱 등)는 다시 부른다.
 */
export const isRetriable = (error: unknown): boolean => {
  if (isApiError(error)) return error.retriable;
  return !(error instanceof TypeError);
};

/** React Query `retry` — `maxRetries` 번까지, 다시 부를 만한 실패만 */
export const retryWhileRetriable =
  (maxRetries: number) =>
  (failureCount: number, error: unknown): boolean =>
    failureCount < maxRetries && isRetriable(error);
