import axios, { AxiosInstance } from "axios";

/**
 * 외부 HTTP 클라이언트 팩토리.
 *
 * **타임아웃 기본값을 여기서 못 박는다.** 기본값 없이 `axios.get` 을 직접 부르면
 * 외부가 느려질 때 요청이 무한정 매달리고, 사용자 ≤10명 서버에서는 그것만으로 멈춘다.
 *
 * 재시도는 넣지 않는다 — 유스케이스마다 재시도 가능 여부가 다르고,
 * **트랜잭션 안에서 외부 I/O 를 부르지 않는 것**(FR-42)이 먼저다.
 */
export interface HttpClientOptions {
  baseURL?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export const DEFAULT_TIMEOUT_MS = 10_000;

export const createHttpClient = ({
  baseURL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  headers,
}: HttpClientOptions = {}): AxiosInstance =>
  axios.create({
    baseURL,
    timeout: timeoutMs,
    headers,
  });
