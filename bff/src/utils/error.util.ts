export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * upstream(`salt-server`) 이 준 **4xx** — status · `code` · `Retry-After` 를 보존한다.
 *
 * axios 에러를 그대로 `next(error)` 하면 error middleware 가 `AppError` 가 아닌 것을 전부
 * 500 으로 만들었다. 서버의 429 가 500 이 되면 화면은 "잠시 후 다시"를 "서버 오류"로
 * 보여 주고, 422 · 404 도 구분하지 못한다(`backend-integration.md` "4xx 는 원 status 보존").
 *
 * **5xx · timeout · 연결 실패는 여기서 다루지 않는다** — 원인 메시지가 민감할 수 있고
 * 어느 status 로 줄지(502/504)는 별도 판단이다. `null` 을 돌려 기존 500 흐름을 탄다.
 */
export interface UpstreamClientError {
  status: number;
  code?: string;
  message: string;
  retryAfter?: string;
}

export const toUpstreamClientError = (
  error: unknown
): UpstreamClientError | null => {
  const response = (
    error as {
      response?: {
        status?: number;
        data?: { code?: unknown; message?: unknown };
        headers?: Record<string, unknown>;
      };
    }
  )?.response;
  const status = response?.status;
  if (typeof status !== "number" || status < 400 || status >= 500) return null;

  const code = response?.data?.code;
  const message = response?.data?.message;
  const retryAfter = response?.headers?.["retry-after"];

  return {
    status,
    ...(typeof code === "string" ? { code } : {}),
    message: typeof message === "string" ? message : "Request failed",
    ...(typeof retryAfter === "string" || typeof retryAfter === "number"
      ? { retryAfter: String(retryAfter) }
      : {}),
  };
};
