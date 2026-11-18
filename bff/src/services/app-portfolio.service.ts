import { backendApi } from "./backend-api.service";
import { logger } from "../config/logger";
import {
  toPortfolioSummaryViewModel,
  type PortfolioSummaryVM,
  type ServerPortfolioSummary,
} from "./portfolio.viewmodel";
import {
  toPositionFlowViewModel,
  toPositionOverviewViewModel,
  toPositionTransactionPageViewModel,
  toPositionTransactionViewModel,
  toTransactionPreviewViewModel,
  isLedgerAssetType,
  type FlowRange,
  type PositionTransactionPageVM,
  type PositionTransactionVM,
  type ServerTransaction,
  type ServerTransactionPage,
  type TransactionCreateInput,
  type TransactionPatchInput,
  type TransactionPreviewInput,
  type TransactionPreviewVM,
  type PositionFlowVM,
  type PositionOverviewVM,
  type ServerPositionFlow,
  type ServerPositionOverview,
} from "./position.viewmodel";

export type { PortfolioSummaryVM };

/** 이름을 붙이려고 읽는 시세 목록 크기. 실시간 테이블과 같은 상한이다. */
const NAME_LOOKUP_LIMIT = 100;
/** 거래 목록 한 쪽 — 서버 기본 50 과 같다 */
export const TRANSACTION_PAGE_SIZE = 50;
/**
 * 거래 쓰기 · 미리보기 예산. 쓰기는 **재시도 0회**(같은 거래가 두 번 생긴다, FR-84) — `backendApi` 는 재시도하지 않는다.
 * 원장 잠금 · 재계산이 한 트랜잭션이라 화면 조회(400ms)보다 넉넉히
 */
const LEDGER_WRITE_TIMEOUT_MS = 5_000;
const LEDGER_PREVIEW_TIMEOUT_MS = 1_500;
/** 국내 주식 이름 조회 — 서버 저장값 읽기(`app-kr-stock.service` 와 같은 800ms) */
const KR_NAME_TIMEOUT_MS = 800;

class AppPortfolioService {
  async getPortfolio(token: string) {
    const [holdings, stats, performance] = await Promise.all([
      backendApi.proxyAuthRequest("GET", "/portfolio/holdings", token),
      backendApi.proxyAuthRequest("GET", "/portfolio/stats", token),
      backendApi.proxyAuthRequest("GET", "/portfolio/performance", token),
    ]);

    return {
      holdings: holdings.data,
      stats: stats.data,
      performance: performance.data,
    };
  }

  /**
   * 홈 "주식" 섹션 요약.
   *
   * 서버는 **심볼만** 안다(`portfolio_holdings` 에 이름 컬럼이 없다). 사람이 읽는
   * 이름은 시세 목록에 있으므로 **BFF 가 붙인다** — 그게 조합 레이어의 일이고,
   * 서버가 `portfolio` → `market` 크로스 컨텍스트 조회를 하나 더 갖는 것보다 싸다.
   *
   * 둘을 **`allSettled`** 로 부른다. 이름 조회가 실패해도 금액은 내려보낸다 —
   * 이름이 없다고 보유가 없는 것은 아니다. 그때는 심볼을 이름 자리에 쓰고
   * `namesDegraded: true` 로 알린다.
   */
  async getSummary(token: string): Promise<PortfolioSummaryVM> {
    const [summaryResult, marketResult] = await Promise.allSettled([
      backendApi.proxyAuthRequest("GET", "/portfolio/summary", token),
      backendApi.getMarketOverview({ page: 1, limit: NAME_LOOKUP_LIMIT }),
    ]);

    if (summaryResult.status === "rejected") throw summaryResult.reason;

    const summary: ServerPortfolioSummary | undefined =
      summaryResult.value.data?.data;
    const krResult = await this.krNames(token, summary);

    const nameBySymbol = new Map<string, string>();
    const logoBySymbol = new Map<string, string>();
    let namesDegraded = true;

    if (marketResult.status === "fulfilled") {
      namesDegraded = false;
      for (const asset of marketResult.value?.items ?? []) {
        if (asset?.symbol && asset?.koreanName) {
          nameBySymbol.set(String(asset.symbol).toUpperCase(), asset.koreanName);
        }
        if (asset?.symbol && typeof asset?.logoUrl === "string" && asset.logoUrl) {
          logoBySymbol.set(String(asset.symbol).toUpperCase(), asset.logoUrl);
        }
      }
    } else {
      logger.warn(
        "보유 요약에 종목명을 붙이지 못했다 — 심볼로 대체한다",
        marketResult.reason?.message
      );
    }

    // 국내 주식은 코인 시세 목록에 없다 — 국내 주식 목록(코드 필터)에서 붙인다. 6자리 코드라 코인 심볼과 겹치지 않는다
    if (krResult) {
      for (const [code, { name, logoUrl }] of krResult.found) {
        nameBySymbol.set(code, name);
        if (logoUrl) logoBySymbol.set(code, logoUrl);
      }
      if (krResult.degraded) namesDegraded = true;
    }

    return toPortfolioSummaryViewModel(summary, nameBySymbol, namesDegraded, logoBySymbol);
  }

  /**
   * 포지션 개요(F006 G절 FR-70 · 73) — 서버 계산을 그대로 옮기고 최대 비중 종목에만 이름 · 로고를 붙인다.
   * 이름 조회는 개요를 받은 **뒤** 한 종목만(최대 비중) — 실패하면 심볼을 이름 자리에 두고 `namesDegraded`(금액은 그대로)
   */
  async getPosition(token: string): Promise<PositionOverviewVM> {
    const response = await backendApi.proxyAuthRequest("GET", "/portfolio/position", token);
    const server = (response.data as { data: ServerPositionOverview }).data;
    const top = server.hero?.topWeight;
    if (!top) return toPositionOverviewViewModel(server, new Map(), false);
    const { names, degraded } = await this.namesFor(token, [{ symbol: top.symbol, assetType: top.assetType }]);
    return toPositionOverviewViewModel(server, names, degraded);
  }

  /** 평가금 흐름(기간 버튼) — 서버 그대로(BFF 계산 0) */
  async getPositionFlow(token: string, range: FlowRange): Promise<PositionFlowVM> {
    const response = await backendApi.proxyAuthRequest("GET", `/portfolio/position/flow?range=${range}`, token);
    return toPositionFlowViewModel((response.data as { data: ServerPositionFlow }).data);
  }

  /**
   * 거래 목록(F006 G절 2단계 · `BFF-REQ-027` FR-80) — 최신순 한 쪽 + 종목 이름 · 로고. 이름은 그 쪽에 나온 종목만(중복 없이) 한 번에.
   * 이름 실패는 심볼을 이름 자리에 두고 `namesDegraded` — 행은 그대로
   */
  async listTransactions(token: string, page: number): Promise<PositionTransactionPageVM> {
    const response = await backendApi.proxyAuthRequest(
      "GET",
      `/portfolio/transactions?page=${page}&limit=${TRANSACTION_PAGE_SIZE}`,
      token,
    );
    const server = (response.data as { data: ServerTransactionPage }).data;
    const seen = new Map<string, { symbol: string; assetType: string }>();
    for (const row of server.transactions) {
      if (isLedgerAssetType(row.assetType)) seen.set(`${row.assetType}:${row.symbol}`, { symbol: row.symbol, assetType: row.assetType });
    }
    const { names, degraded } = seen.size > 0 ? await this.namesFor(token, [...seen.values()]) : { names: new Map(), degraded: false };
    return toPositionTransactionPageViewModel(server, names, degraded);
  }

  /** 거래 미리보기 — 쓰지 않는다 · 서버 값 그대로(FR-81). 과매도 · 남의 거래는 서버 4xx 코드 그대로(error middleware) */
  async previewTransaction(token: string, input: TransactionPreviewInput): Promise<TransactionPreviewVM> {
    const body =
      "transactionId" in input
        ? input
        : { assetType: input.assetType, symbol: input.symbol, transactionType: input.side, quantity: input.quantity, price: input.price, ...(input.transactionDate ? { transactionDate: input.transactionDate } : {}) };
    const response = await backendApi.proxyAuthRequest("POST", "/portfolio/transactions/preview", token, body, {
      timeout: LEDGER_PREVIEW_TIMEOUT_MS,
    });
    return toTransactionPreviewViewModel((response.data as { data: TransactionPreviewVM }).data);
  }

  /** 거래 기록 — **주문이 아니다**(거래소 호출 0, FR-85). 재시도 0회 */
  async createTransaction(token: string, input: TransactionCreateInput): Promise<PositionTransactionVM> {
    const response = await backendApi.proxyAuthRequest(
      "POST",
      "/portfolio/transactions",
      token,
      {
        assetType: input.assetType,
        symbol: input.symbol,
        transactionType: input.side,
        quantity: input.quantity,
        price: input.price,
        ...(input.transactionDate ? { transactionDate: input.transactionDate } : {}),
      },
      { timeout: LEDGER_WRITE_TIMEOUT_MS },
    );
    return this.namedTransaction(token, (response.data as { data: ServerTransaction }).data);
  }

  /** 거래 수정 — 수량 · 단가 · 거래일만(종목 · 매수/매도는 서버가 400) */
  async updateTransaction(token: string, id: string, patch: TransactionPatchInput): Promise<PositionTransactionVM> {
    const response = await backendApi.proxyAuthRequest("PATCH", `/portfolio/transactions/${encodeURIComponent(id)}`, token, patch, {
      timeout: LEDGER_WRITE_TIMEOUT_MS,
    });
    return this.namedTransaction(token, (response.data as { data: ServerTransaction }).data);
  }

  async deleteTransaction(token: string, id: string): Promise<void> {
    await backendApi.proxyAuthRequest("DELETE", `/portfolio/transactions/${encodeURIComponent(id)}`, token, undefined, {
      timeout: LEDGER_WRITE_TIMEOUT_MS,
    });
  }

  /** 쓰기 응답 한 행에 이름 — 이름 실패는 쓰기 실패가 아니다(심볼로) */
  private async namedTransaction(token: string, row: ServerTransaction): Promise<PositionTransactionVM> {
    const assetType = isLedgerAssetType(row.assetType) ? row.assetType : "crypto";
    const { names } = await this.namesFor(token, [{ symbol: row.symbol, assetType }]).catch(() => ({ names: new Map() }));
    return toPositionTransactionViewModel({ ...row, assetType }, names);
  }

  /** 종목 이름 · 로고 — 코인은 시세 목록, 국내는 국내 목록(보유 요약과 같은 출처) */
  private async namesFor(
    token: string,
    items: Array<{ symbol: string; assetType: string }>,
  ): Promise<{ names: Map<string, { name: string; logoUrl: string | null }>; degraded: boolean }> {
    const names = new Map<string, { name: string; logoUrl: string | null }>();
    let degraded = false;
    const crypto = items.filter((i) => i.assetType === "crypto").map((i) => i.symbol.toUpperCase());
    const [marketResult, krResult] = await Promise.allSettled([
      crypto.length > 0 ? backendApi.getMarketOverview({ page: 1, limit: NAME_LOOKUP_LIMIT }) : Promise.resolve(null),
      this.krNames(token, { items: items.map((i) => ({ ...i, currentValue: 0, profitRate: 0 })) }),
    ]);
    if (marketResult.status === "fulfilled") {
      for (const asset of marketResult.value?.items ?? []) {
        const symbol = String(asset?.symbol ?? "").toUpperCase();
        if (crypto.includes(symbol) && asset?.koreanName) {
          names.set(symbol, { name: asset.koreanName, logoUrl: typeof asset.logoUrl === "string" && asset.logoUrl ? asset.logoUrl : null });
        }
      }
      if (crypto.some((symbol) => !names.has(symbol))) degraded = true;
    } else {
      degraded = true;
      logger.warn("포지션에 종목명을 붙이지 못했다 — 심볼로 대체한다", { reason: marketResult.reason?.message });
    }
    if (krResult.status === "fulfilled" && krResult.value) {
      for (const [code, value] of krResult.value.found) names.set(code, value);
      if (krResult.value.degraded) degraded = true;
    }
    return { names, degraded };
  }

  /**
   * 국내 주식 보유의 이름 · 로고(F011 슬라이스 3b). 보유가 없으면 부르지 않는다. 실패 · 꺼짐 · 없는 종목(404)면 코드를
   * 이름 자리에 두고 `namesDegraded` — 금액은 그대로 내려간다(코인 이름 조회와 같은 규칙)
   */
  private async krNames(
    token: string,
    summary: ServerPortfolioSummary | undefined,
  ): Promise<{ found: Map<string, { name: string; logoUrl: string | null }>; degraded: boolean } | null> {
    const codes = (summary?.items ?? []).filter((i) => i.assetType === "kr_stock").map((i) => i.symbol);
    if (codes.length === 0) return null;
    const found = new Map<string, { name: string; logoUrl: string | null }>();
    try {
      const response = await backendApi.proxyAuthRequest(
        "GET",
        `/market/kr/assets?limit=${Math.min(codes.length, NAME_LOOKUP_LIMIT)}&codes=${codes.slice(0, NAME_LOOKUP_LIMIT).join(",")}`,
        token,
        undefined,
        { timeout: KR_NAME_TIMEOUT_MS },
      );
      const items = (response.data as { data?: { items?: unknown } })?.data?.items;
      for (const item of Array.isArray(items) ? items : []) {
        const row = item as { code?: unknown; name?: unknown; logoUrl?: unknown };
        if (typeof row.code === "string" && typeof row.name === "string") {
          found.set(row.code, { name: row.name, logoUrl: typeof row.logoUrl === "string" && row.logoUrl ? row.logoUrl : null });
        }
      }
      return { found, degraded: codes.some((code) => !found.has(code)) };
    } catch (error) {
      logger.warn("보유 요약에 국내 주식 이름을 붙이지 못했다 — 코드로 대체한다", (error as Error)?.message);
      return { found, degraded: true };
    }
  }
}

export const appPortfolioService = new AppPortfolioService();
