import path from "node:path";

import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";

import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { loggableUrl } from "../../utils/error.util";
import { recordGolden } from "./golden";
import { RouteMode, RoutingTableFile } from "./routing-table";
import { compareResponses, isShadowable, ShadowGate, ShadowLog } from "./shadow";
import { outgoingTraceparent } from "./trace";

/**
 * 서버 호출 한 곳(`backendApi`)에 붙는 스트랭글러 장치(`BFF-REQ-045`). 프론트 계약은 그대로 — 뒤의 서버만 경로 단위로 바뀐다.
 *
 * 요청 전: 라우팅 표로 서버 주소 결정(FR-1 · 6) + `traceparent`(FR-7).
 * 응답 뒤: 골든 녹화(켜져 있으면, FR-2) · `shadow` 경로면 platform 비교(읽기만, FR-3 · 4) — **응답을 기다리게 하지 않는다**.
 */
type RoutedConfig = InternalAxiosRequestConfig & { saltRoute?: RouteMode };

export const serverRoutes = new RoutingTableFile(path.resolve(env.SERVER_ROUTES_FILE));

/** 서비스별 주소(FR-6). S0~S2 는 서비스 전부가 같은 platform 주소라 값이 하나다. */
const baseUrlFor = (mode: RouteMode): string => (mode === "platform" ? env.PLATFORM_API_URL : env.BACKEND_API_URL);

/** 그림자 요청용 — 인터셉터 없는 별도 클라이언트(되돌아 들어와 다시 그림자를 만들지 않게). */
const shadowClient = axios.create({ timeout: 10_000, validateStatus: () => true });
const shadowLog = new ShadowLog(path.resolve(env.SHADOW_REPORT_DIR));
const shadowGate = new ShadowGate(env.SHADOW_MAX_IN_FLIGHT, env.SHADOW_SAMPLE_RATE);

export const beforeServerRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const routed = config as RoutedConfig;
  const mode = serverRoutes.modeFor(config.url ?? "");
  routed.saltRoute = mode;
  routed.baseURL = baseUrlFor(mode);
  routed.headers.set("traceparent", outgoingTraceparent());
  return routed;
};

export const afterServerResponse = (config: InternalAxiosRequestConfig | undefined, response: AxiosResponse | undefined): void => {
  if (!config || !response || config.responseType === "stream") return;
  const routed = config as RoutedConfig;
  const method = (config.method ?? "get").toUpperCase();
  const url = config.url ?? "";

  if (env.GOLDEN_RECORD_DIR) {
    try {
      recordGolden(env.GOLDEN_RECORD_DIR, method, withQuery(config), response.status, response.data);
    } catch (error) {
      logger.warn("Golden record failed", { reason: (error as Error).message });
    }
  }

  if (routed.saltRoute === "shadow" && isShadowable(method, config.responseType) && shadowGate.tryEnter()) {
    void runShadow(routed, method, url, response).finally(() => shadowGate.leave());
  }
};

const runShadow = async (config: RoutedConfig, method: string, url: string, legacy: AxiosResponse): Promise<void> => {
  const started = Date.now();
  const at = new Date().toISOString();
  const pathOnly = loggableUrl(url.split("?")[0] ?? "");
  try {
    const platform = await shadowClient.request({
      method,
      url,
      baseURL: env.PLATFORM_API_URL,
      params: config.params,
      headers: pick(config.headers, ["Authorization", "traceparent", "x-salt-client"]),
    });
    const { match, firstDiff } = compareResponses(legacy, platform);
    await shadowLog.append({ at, method, path: pathOnly, legacyStatus: legacy.status, platformStatus: platform.status, match, firstDiff, platformMs: Date.now() - started });
    if (!match) logger.info("Shadow mismatch", { method, path: pathOnly, firstDiff });
  } catch (error) {
    await shadowLog
      .append({ at, method, path: pathOnly, legacyStatus: legacy.status, platformStatus: null, match: false, firstDiff: null, platformMs: Date.now() - started, error: (error as Error).message })
      .catch((e) => logger.warn("Shadow log write failed", { reason: (e as Error).message }));
  }
};

const pick = (headers: InternalAxiosRequestConfig["headers"], names: string[]): Record<string, string> =>
  Object.fromEntries(names.flatMap((n) => (headers.get(n) ? [[n, String(headers.get(n))]] : [])));

/** 실제로 보낸 주소 — axios 자신의 직렬화(`getUri`)로. 손으로 만들면 undefined · 배열이 실제 요청과 달라진다 */
const withQuery = (config: InternalAxiosRequestConfig): string =>
  shadowClient.getUri({ url: config.url, params: config.params, paramsSerializer: config.paramsSerializer });
