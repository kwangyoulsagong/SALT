/**
 * 조회(GET) upstream 재시도 — **최대 1회** (`performance-bff.md` §3 · `BFF-REQ-025` 호출 맵).
 *
 * 다시 부르는 경우는 **응답이 없거나(timeout · 연결 실패) 5xx** 일 때뿐이다.
 * 4xx 는 다시 불러도 같은 답이고, 429 를 재시도하면 쿨다운을 스스로 연장한다.
 * 클라이언트가 끊어 `signal` 이 abort 됐으면 다시 부르지 않는다.
 *
 * **mutation 에 쓰지 않는다** — 중복 생성이다. 이 함수는 호출부가 GET 임을 보장한다.
 */
export const isRetryable = (error: unknown): boolean => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (typeof status === "number") return status >= 500;
  // 취소는 실패가 아니다 — 사용자가 이미 다른 종목을 보고 있다
  const code = (error as { code?: string })?.code;
  return code !== "ERR_CANCELED";
};

export const retryOnceOnGet = async <T>(
  call: () => Promise<T>,
  signal?: AbortSignal
): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    if (signal?.aborted || !isRetryable(error)) throw error;
    return call();
  }
};
