import { AppError } from "../utils/error.util";
import { retryOnceOnGet } from "../utils/retry.util";
import { createHash } from "node:crypto";

import { backendApi } from "./backend-api.service";
import {
  SymbolCoachContractError,
  toExchangeFlag,
  toSymbolCoachViewModel,
  type ServerSymbolCoach,
  type ServerSymbolNews,
} from "./symbol-coach.viewmodel";
import { TradeCheckContractError, toTradeCheckViewModel } from "./trade-check.viewmodel";
import { ExplanationContractError, toExplanationViewModel } from "./explanation.viewmodel";
import { CoachPanelContractError, toCoachPanelViewModel } from "./coach-panel.viewmodel";

/** `BFF-REQ-025` 호출 맵 — 판단 · 뉴스 모두 300ms. 화면 예산 200ms(`BFF-REQ-026` FR-50) */
const SYMBOL_COACH_TIMEOUT_MS = 300;
const SYMBOL_NEWS_TIMEOUT_MS = 300;
/** 점검(F017 v2 단계 2) — 화면 맨 위 칸이라 예산 p95 200ms(`BFF-REQ-052` FR-3). 서버 실측 30~65ms */
const TRADE_CHECK_TIMEOUT_MS = 200;
/**
 * 판단 호출이 시간을 넘기면 마지막으로 받은 판단을 기준 시각과 함께 준다(`BFF-REQ-052` FR-2, 2026-11-10 — 장중 504 157줄).
 * 키는 **토큰 해시** — 검증 안 한 사용자 id 로 키를 잡으면 위조 토큰이 남의 판단을 읽는다. 10분 넘은 판단은 주지 않는다(504 그대로)
 */
const DETAIL_STALE_MAX_MS = 10 * 60_000;
const DETAIL_STALE_MAX_ENTRIES = 500;
const lastDetail = new Map<string, { view: ReturnType<typeof toSymbolCoachViewModel>; at: number }>();
const detailKey = (token: string, path: string) => createHash("sha256").update(token).update("\0").update(path).digest("hex");
const rememberDetail = (key: string, view: ReturnType<typeof toSymbolCoachViewModel>, now: number) => {
  lastDetail.delete(key);
  lastDetail.set(key, { view, at: now });
  if (lastDetail.size > DETAIL_STALE_MAX_ENTRIES) lastDetail.delete(lastDetail.keys().next().value!);
};
/** 테스트 전용 */
export const __resetDetailMemory = () => lastDetail.clear();
/**
 * 해설(F017 v2 단계 3 · `BFF-REQ-052` FR-2) — 서버는 저장값만 읽는다(LLM 0, 배치가 미리 만든다). 판단 · 점검과 같은 예산.
 * 예전 즉석 해설(20초 · 동시 2 · SSE 중계)은 서버 경로와 함께 지웠다
 */
const EXPLANATION_TIMEOUT_MS = 300;
/**
 * 한 장 패널(F017 v4 1d · `BFF-REQ-052` FR-6) — 서버가 칸 일곱을 같이 읽는다. 실측(157종목 · 동시 4) p95 140ms · 순차 p95 68ms.
 * 예산은 코치 상세와 같은 400ms(`performance-bff.md` §1)
 */
const PANEL_TIMEOUT_MS = 400;

type BackendEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export class AppAICoachService {
  /**
   * 사기 전 · 팔기 전 점검 — AI 패널 맨 위 쉬운 한 줄(`BFF-REQ-052` FR-3). 서버 문장 · 숫자를 고치지 않는다.
   * 모양이 깨졌으면 502 — 지어낸 문장을 주지 않는다. 조회라 1회 재시도
   */
  async getTradeCheck(token: string, query: { symbol?: unknown; side?: unknown }, signal?: AbortSignal) {
    const symbol = typeof query.symbol === "string" ? query.symbol.trim().toUpperCase() : "";
    if (!/^[A-Z0-9]{1,20}$/.test(symbol)) throw new AppError("symbol 형식이 다릅니다", 400, true, "INVALID_SYMBOL");
    const side = query.side === "sell" ? "sell" : "buy";
    const response = await retryOnceOnGet(
      () =>
        backendApi.proxyAuthRequest(
          "GET",
          `/coach/check?symbol=${encodeURIComponent(symbol)}&side=${side}`,
          token,
          undefined,
          { timeout: TRADE_CHECK_TIMEOUT_MS, signal },
        ),
      signal,
    );
    try {
      return toTradeCheckViewModel((response.data as BackendEnvelope<unknown>).data);
    } catch (error) {
      if (error instanceof TradeCheckContractError) throw new AppError("trade_check_unavailable", 502);
      throw error;
    }
  }

  /**
   * 한 장 패널 한 번 응답 — 칸마다 `tier` · `status`, 한 칸이 깨지면 그 칸만 결함(`toCoachPanelViewModel`). 머리가 깨졌으면 502.
   * 조회라 1회 재시도 · 401 은 그대로(부분 실패로 삼키지 않는다 — 서버가 패널 전체에 401 을 준다)
   */
  async getPanel(token: string, query: { symbol?: unknown }, signal?: AbortSignal) {
    const symbol = typeof query.symbol === "string" ? query.symbol.trim().toUpperCase() : "";
    if (!/^[A-Z0-9]{1,20}$/.test(symbol)) throw new AppError("symbol 형식이 다릅니다", 400, true, "INVALID_SYMBOL");
    const response = await retryOnceOnGet(
      () =>
        backendApi.proxyAuthRequest("GET", `/coach/panel?symbol=${encodeURIComponent(symbol)}`, token, undefined, {
          timeout: PANEL_TIMEOUT_MS,
          signal,
        }),
      signal,
    );
    try {
      return toCoachPanelViewModel((response.data as BackendEnvelope<unknown>).data);
    } catch (error) {
      if (error instanceof CoachPanelContractError) throw new AppError("coach_panel_unavailable", 502);
      throw error;
    }
  }

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
    // 하위 호환 필드(`modeDecision` · `dualDecision`)에는 서버 게이트가 없다 — 투자유의면 비운다(`BFF-REQ-039` FR-6)
    const warned = toExchangeFlag(data.exchangeFlag)?.warning === true;
    const decision = warned ? undefined : data.modeDecision;

    return {
      symbol: data.symbol,
      headline: warned ? null : data.headline,
      // 판단이 없으면 `null` — "관망" 을 지어내지 않는다(`BFF-REQ-023` FR-93)
      badge: decision?.label ?? null,
      decisions: {
        scalp: this.mapDecision(warned ? undefined : data.dualDecision?.scalp),
        longTerm: this.mapDecision(warned ? undefined : data.dualDecision?.longTerm),
      },
      reasons: decision?.reasons ?? [],
      risks: decision?.risks ?? [],
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

    const key = detailKey(token, `${symbol}${mode}`);
    if (coach.status === "rejected") {
      const kept = lastDetail.get(key);
      if (kept && Date.now() - kept.at <= DETAIL_STALE_MAX_MS) {
        return { ...kept.view, staleSince: new Date(kept.at).toISOString() };
      }
      throw coach.reason;
    }

    const data = (coach.value.data as BackendEnvelope<ServerSymbolCoach>).data;
    const newsData =
      news.status === "fulfilled"
        ? (news.value.data as BackendEnvelope<ServerSymbolNews>).data
        : null;

    try {
      const view = toSymbolCoachViewModel(data, newsData);
      rememberDetail(key, view, Date.now());
      return view;
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
      // 매입가 숨김(F009 FR-27 · `BFF-REQ-038`). 서버가 안 주면 false — 숨김을 지어내지 않는다
      hidePurchasePrice: data.hidePurchasePrice === true,
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
      hidePurchasePrice: data.hidePurchasePrice === true,
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
   * 종목 해설 — 4단 중 하나(`latest` · `previous` · `template` · `none`), 빈 칸 0. 서버 그대로 · 캐시 0.
   * GET 이라 한 번 재시도(`retryOnceOnGet`). 모양이 깨지면 502 — 문장을 지어내지 않는다
   */
  async getExplanation(token: string, query: { symbol?: unknown; mode?: unknown }, signal?: AbortSignal) {
    const symbol = typeof query.symbol === "string" ? query.symbol.trim().toUpperCase() : "";
    if (!/^[A-Z0-9]{1,20}$/.test(symbol)) throw new AppError("symbol 형식이 다릅니다", 400, true, "INVALID_SYMBOL");
    if (query.mode !== "scalp" && query.mode !== "long_term") {
      throw new AppError("mode 는 scalp · long_term", 400, true, "INVALID_MODE");
    }
    const response = await retryOnceOnGet(
      () =>
        backendApi.proxyAuthRequest(
          "GET",
          `/ai-coach/explanation?symbol=${encodeURIComponent(symbol)}&mode=${query.mode}`,
          token,
          undefined,
          { timeout: EXPLANATION_TIMEOUT_MS, signal },
        ),
      signal,
    );
    try {
      return toExplanationViewModel((response.data as BackendEnvelope<unknown>).data);
    } catch (error) {
      if (error instanceof ExplanationContractError) throw new AppError("explanation_unavailable", 502);
      throw error;
    }
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
