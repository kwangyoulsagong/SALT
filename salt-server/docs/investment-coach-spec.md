# Investment Coach Server Spec

## Endpoint: GET /api/ai-coach

Auth: required.

Query:

| Field | Type | Required | Default |
|---|---|---|---|
| symbol | string | no | `BTC` when symbol-specific response is requested |
| mode | `scalp` \| `long_term` | no | `scalp` |
| preview | boolean string | no | `false` |

Response data:

```ts
type AICoachResponse = {
  symbol: string;
  mode: "scalp" | "long_term";
  preview: boolean;
  headline: string;
  modeDecision: ModeDecision;
  dualDecision: {
    scalp: ModeDecision;
    longTerm: ModeDecision;
  };
  riskGuard: {
    hasHolding: boolean;
    holdingWeightLimit: number;
    currentValue: number;
    unrealizedProfitRate: number | null;
  };
  evidence: {
    price: number | null;
    change24h: number | null;
    sentiment: unknown | null;
    technical: unknown | null;
    whale: {
      buyAmountKRW: number;
      sellAmountKRW: number;
      count: number;
    };
  };
  missingData: string[];
  dataFreshness: {
    priceUpdatedAt: Date | null;
    sentimentCalculatedAt: Date | null;
    indicatorTimestamp: Date | null;
    generatedAt: string;
  };
};
```

## Endpoint: POST /api/ai-coach/generate

Auth: required.

Body:

```ts
type GenerateCoachBody = {
  symbol?: string;
  mode?: "scalp" | "long_term";
};
```

Behavior:

- Upserts `InvestmentInsight` with `type=ai_coach`, `dedupeKey=main_coach`.
- Extends payload with `mode`, `symbol`, `decision`, `dualDecision`, `missingData`, `dataFreshness`, `generatedAt`.
- Does not create order execution objects.

## Endpoint: POST /api/trade-preflight

Auth: required.

Body:

```ts
type TradePreflightBody = {
  symbol: string;
  entryPrice: number;
  stopPrice?: number;
  takeProfitPrices?: number[];
  amount: number;
  mode?: "scalp" | "long_term";
};
```

Response data:

```ts
type TradePreflightResponse = {
  symbol: string;
  mode: "scalp" | "long_term";
  orderExecution: false;
  calculation: {
    entryPrice: number;
    stopPrice: number | null;
    takeProfitPrices: number[];
    amount: number;
    riskRewardRatio: number | null;
    maxLossAmount: number | null;
    maxLossRate: number | null;
    projectedWeight: number;
    maxSingleAssetWeight: number;
  };
  portfolioImpact: {
    totalValue: number;
    existingSymbolValue: number;
    projectedTotalValue: number;
    projectedSymbolValue: number;
    projectedWeight: number;
  };
  checklist: Array<{
    key: string;
    passed: boolean;
    label: string;
  }>;
  warnings: Array<{
    code: string;
    severity: "info" | "warning" | "danger";
    message: string;
  }>;
  dataFreshness: {
    priceUpdatedAt: Date | null;
    stale: boolean;
  };
};
```

## Endpoint: GET /api/behavior-coach

Auth: required.

Response data:

```ts
type BehaviorCoachResponse = {
  status: "insufficient_data" | "active" | "stable";
  tags: string[];
  warnings: Array<{
    id: string;
    title: string;
    message: string;
    severity: number;
    confidence: number | null;
    payload: unknown;
  }>;
  recommendedRules: string[];
  evidence: {
    transactionCount: number;
    insightCount?: number;
    minimumRequired?: number;
  };
};
```

## Phase 2 Endpoints

| Endpoint | Method | Purpose | Status |
|---|---|---|---|
| `/api/ai-coach/profile` | GET | 투자 코치 프로필 조회 | implemented |
| `/api/ai-coach/profile` | PATCH | 투자 성향 저장 | implemented |
| `/api/ai-coach/feedback` | POST | 코치 피드백 기록 | implemented |
| `/api/profit-plan` | GET | 보유 종목 익절/손절 플랜 | implemented |
| `/api/signal-performance` | GET | 코치 신호 성과 집계 | implemented |
| `/api/market-intelligence/:symbol/news` | GET | 종목 뉴스 근거 3개 | implemented |

## File Placement

| Concern | Files |
|---|---|
| AI coach DTO | `src/modules/investment-insight/ai-coach/ai-coach.dto.ts` |
| AI coach route/controller/service | existing `ai-coach` module |
| Trade preflight | `src/modules/trade-preflight/*` |
| Behavior coach | `src/modules/behavior-coach/*` |
| App registration | `src/app.ts` |
