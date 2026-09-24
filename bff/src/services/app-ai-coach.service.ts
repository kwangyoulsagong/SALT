import { createConcurrencyGate } from "../utils/concurrency.util";
import { AppError } from "../utils/error.util";
import { retryOnceOnGet } from "../utils/retry.util";
import { createSseParser, type SseEvent } from "../utils/sse.util";
import { backendApi } from "./backend-api.service";
import {
  SymbolCoachContractError,
  toSymbolCoachViewModel,
  type ServerSymbolCoach,
  type ServerSymbolNews,
} from "./symbol-coach.viewmodel";

/** `BFF-REQ-025` 호출 맵 — 판단 · 뉴스 모두 300ms. 화면 예산 200ms(`BFF-REQ-026` FR-50) */
const SYMBOL_COACH_TIMEOUT_MS = 300;
const SYMBOL_NEWS_TIMEOUT_MS = 300;
/** `BFF-REQ-025` FR-1 — LLM 호출이다. 재시도 0회(FR-2) */
const EXPLAIN_TIMEOUT_MS = 20_000;
/** `BFF-REQ-025` FR-7 — 동시 `explain` 상한. 넘으면 429 로 바로 돌려보낸다 */
const EXPLAIN_MAX_CONCURRENT = 2;

const explainGate = createConcurrencyGate(EXPLAIN_MAX_CONCURRENT);
/** 해설 스트림 대화당 상한(`streaming-sse.md` §7) · 소켓 유휴 상한(서버 ping 15초보다 길게) */
const EXPLAIN_STREAM_MAX_MS = 60_000;
const EXPLAIN_STREAM_IDLE_MS = 30_000;
/** 화면 계약에 있는 이벤트만 옮긴다(`streaming-sse.md` §3). `ping` 은 BFF 가 스스로 보낸다 */
const EXPLAIN_STREAM_EVENTS = new Set([
  "message.start",
  "message.step",
  "message.blocked",
  "message.card",
  "message.delta",
  "message.replace",
  "message.done",
  "message.error",
]);

type BackendEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export class AppAICoachService {
  async getPreview(token: string, query: any) {
    const symbol = (query.symbol || "BTC").toString().toUpperCase();
    const response = await retryOnceOnGet(() =>
      backendApi.proxyAuthRequest(
        "GET",
        `/ai-coach?symbol=${encodeURIComponent(symbol)}&preview=true`,
        token,
      ),
    );
    const data = (response.data as BackendEnvelope<any>).data;

    return {
      symbol: data.symbol,
      headline: data.headline,
      // 판단이 없으면 `null` — "관망" 을 지어내지 않는다(`BFF-REQ-023` FR-93)
      badge: data.modeDecision?.label ?? null,
      decisions: {
        scalp: this.mapDecision(data.dualDecision?.scalp),
        longTerm: this.mapDecision(data.dualDecision?.longTerm),
      },
      reasons: data.modeDecision?.reasons ?? [],
      risks: data.modeDecision?.risks ?? [],
      missingData: data.missingData ?? [],
      dataFreshness: data.dataFreshness,
    };
  }

  /**
   * 종목 판단 — 우측 AI 코치 패널 · 상세 분석 페이지 (`BFF-REQ-023` FR-90~99).
   *
   * 판단과 뉴스를 **병렬로** 부른다(FR-97). 판단이 실패하면 응답 전체가 실패하고,
   * 뉴스가 실패하면 판단은 응답하고 `degradedFields: ['news']` 다.
   *
   * `mode` 가 없으면 서버에 보내지 않는다 — 기본 모드는 서버가 정한다(FR-94 · B16).
   */
  async getDetail(token: string, query: any, signal?: AbortSignal) {
    const symbol = encodeURIComponent(
      (query.symbol || "BTC").toString().toUpperCase(),
    );
    const mode =
      query.mode === "scalp" || query.mode === "long_term"
        ? `&mode=${query.mode}`
        : "";

    // 둘 다 조회라 각자 1회 재시도한다(호출 맵). 재시도도 병렬이다 — 뉴스 재시도가 판단을 늦추지 않는다
    const [coach, news] = await Promise.allSettled([
      retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest(
            "GET",
            `/ai-coach?symbol=${symbol}${mode}`,
            token,
            undefined,
            { timeout: SYMBOL_COACH_TIMEOUT_MS, signal },
          ),
        signal,
      ),
      retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest(
            "GET",
            `/market-intelligence/${symbol}/news?limit=3`,
            token,
            undefined,
            { timeout: SYMBOL_NEWS_TIMEOUT_MS, signal },
          ),
        signal,
      ),
    ]);

    if (coach.status === "rejected") throw coach.reason;

    const data = (coach.value.data as BackendEnvelope<ServerSymbolCoach>).data;
    const newsData =
      news.status === "fulfilled"
        ? (news.value.data as BackendEnvelope<ServerSymbolNews>).data
        : null;

    try {
      return toSymbolCoachViewModel(data, newsData);
    } catch (error) {
      if (error instanceof SymbolCoachContractError) {
        throw new AppError("coach_unavailable", 502);
      }
      throw error;
    }
  }

  async getProfile(token: string) {
    const response = await backendApi.proxyAuthRequest(
      "GET",
      "/ai-coach/profile",
      token,
    );
    const data = (response.data as BackendEnvelope<any>).data;

    return {
      riskTolerance: data.riskTolerance,
      maxSingleAssetWeight: data.maxSingleAssetWeight,
      rebalanceBand: data.rebalanceBand,
      panicSellWindowHours: data.panicSellWindowHours,
      defaultMode: data.defaultMode,
      notificationLevel: data.notificationLevel,
      supportedModes: data.supportedModes ?? ["scalp", "long_term"],
    };
  }

  async updateProfile(token: string, body: any) {
    const response = await backendApi.proxyAuthRequest(
      "PATCH",
      "/ai-coach/profile",
      token,
      body,
    );
    const data = (response.data as BackendEnvelope<any>).data;

    return {
      riskTolerance: data.riskTolerance,
      maxSingleAssetWeight: data.maxSingleAssetWeight,
      rebalanceBand: data.rebalanceBand,
      panicSellWindowHours: data.panicSellWindowHours,
      defaultMode: data.defaultMode,
      notificationLevel: data.notificationLevel,
      // `unsupportedPersistedFields` 는 뺐다 — 서버가 두 필드를 저장하게 돼(SRV-REQ-025 FR-13)
      // 늘 빈 배열이었다. 소비처 0건(2026-09-23 grep)
    };
  }

  async feedback(token: string, body: any) {
    const response = await backendApi.proxyAuthRequest(
      "POST",
      "/ai-coach/feedback",
      token,
      body,
    );
    const data = (response.data as BackendEnvelope<any>).data;

    return {
      id: data.id,
      symbol: data.symbol,
      recordedAt: data.createdAt,
      status: "recorded",
    };
  }

  /**
   * 즉석 해설(LLM) — `BFF-REQ-023` FR-100 · `BFF-REQ-025` FR-1~12 · FR-34~35 · FR-44.
   *
   * - **토큰을 전달한다.** 서버 `explain` 은 아직 공개 경로라 토큰을 무시한다 — BFF 가 먼저
   *   보내야 서버가 인증을 켜도 끊기지 않는다(FR-11 "BFF 먼저").
   * - 20s · **재시도 0회.** 서버가 폴백을 갖고 있고 LLM 재시도는 비용이다.
   * - 동시 2개. 넘으면 서버에 보내지 않고 429 `explain_busy`.
   * - 본문을 가공 · 로깅하지 않는다. `{ renderable: false }` 도 200 으로 그대로 전달한다.
   */
  async explain(token: string, body: unknown, signal?: AbortSignal) {
    const release = explainGate.tryAcquire();
    if (!release) throw new AppError("explain_busy", 429);

    try {
      const response = await backendApi.proxyAuthRequest(
        "POST",
        "/ai-coach/explain",
        token,
        body,
        { timeout: EXPLAIN_TIMEOUT_MS, signal },
      );
      return (response.data as BackendEnvelope<unknown>).data;
    } finally {
      release();
    }
  }

  /**
   * 해설 스트림(SSE) 중계 — F008 `BFF-REQ-037` FR-6 · `streaming-sse.md`.
   *
   * - 동시 상한은 단건 `explain` 과 **같은 문**을 쓴다 — 넘으면 스트림을 열기 전에 429
   * - 서버 4xx 는 스트림을 열기 전에 그대로 던진다(400 · 401 · 429)
   * - 이벤트는 **계약에 있는 이름만** 옮긴다. 토큰을 저장 · 변형 · 로깅하지 않는다(§2 · §8)
   * - 대화당 60초 상한(§7) — 넘으면 끊고 `message.error`
   *
   * 반환된 `events` 를 다 읽거나 `close()` 하면 문이 열린다.
   */
  async openExplainStream(token: string, body: unknown, signal: AbortSignal) {
    const release = explainGate.tryAcquire();
    if (!release) throw new AppError("explain_busy", 429);

    const upstreamAbort = new AbortController();
    const onAbort = () => upstreamAbort.abort();
    signal.addEventListener("abort", onAbort, { once: true });
    const cap = setTimeout(() => upstreamAbort.abort(), EXPLAIN_STREAM_MAX_MS);
    const close = () => {
      clearTimeout(cap);
      signal.removeEventListener("abort", onAbort);
      release();
    };

    let stream: NodeJS.ReadableStream;
    try {
      stream = await backendApi.openAuthStream("/ai-coach/explain/stream", token, body, {
        timeout: EXPLAIN_STREAM_IDLE_MS,
        signal: upstreamAbort.signal,
      });
    } catch (error) {
      close();
      throw error;
    }

    async function* events(): AsyncGenerator<SseEvent> {
      const queue: SseEvent[] = [];
      const parse = createSseParser((e) => {
        if (EXPLAIN_STREAM_EVENTS.has(e.event)) queue.push(e);
      });
      try {
        for await (const chunk of stream) {
          parse(chunk.toString());
          while (queue.length > 0) yield queue.shift()!;
        }
        if (upstreamAbort.signal.aborted && !signal.aborted) {
          yield { event: "message.error", data: JSON.stringify({ code: "LLM_TIMEOUT", fallback: "rule" }) };
        }
      } finally {
        close();
      }
    }

    return { events: events(), close: () => { upstreamAbort.abort(); close(); } };
  }

  private mapDecision(decision: any) {
    if (!decision) return null;

    return {
      mode: decision.mode,
      label: decision.label,
      action: decision.action,
      riskLevel: decision.riskLevel,
      timeframe: decision.timeframe,
      headline: decision.headline,
      reasons: decision.reasons ?? [],
      risks: decision.risks ?? [],
      score: decision.score,
    };
  }
}

export const appAICoachService = new AppAICoachService();
