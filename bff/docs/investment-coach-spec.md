# Investment Coach BFF Spec

## Endpoint: GET /api/app/ai-coach/preview

Auth: required.

Backend dependency:

- `GET /api/ai-coach?symbol={symbol}&preview=true`

Query:

```ts
type PreviewQuery = {
  symbol?: string;
};
```

Response data:

```ts
type CoachPreviewView = {
  symbol: string;
  headline: string;
  badge: string;
  decisions: {
    scalp: DecisionCard | null;
    longTerm: DecisionCard | null;
  };
  reasons: string[];
  risks: string[];
  missingData: string[];
  dataFreshness: unknown;
};
```

## Endpoint: GET /api/app/ai-coach/detail

Auth: required.

Backend dependency:

- `GET /api/ai-coach?symbol={symbol}&mode={mode}`

Query:

```ts
type DetailQuery = {
  symbol?: string;
  mode?: "scalp" | "long_term";
};
```

Response data:

```ts
type CoachDetailView = {
  header: {
    symbol: string;
    mode: "scalp" | "long_term";
    headline: string;
    badge: string;
  };
  decisionCards: DecisionCard[];
  riskGuard: unknown;
  preflightDefaults: {
    symbol: string;
    entryPrice: number | null;
    mode: "scalp" | "long_term";
  };
  evidence: unknown;
  missingData: string[];
  dataFreshness: unknown;
};
```

## Endpoint: POST /api/app/ai-coach/explain

Auth: public for prototype demo. Production 전 rate-limit/auth 검토 필요.

Backend dependency:

- `POST /api/ai-coach/explain`

Body:

```ts
type ExplainCoachBody = {
  symbol: string;
  koreanName: string;
  mode: "scalp" | "long_term";
  currentPrice: number;
  change24h: number;
  tradeValue24h: number;
  confidence: number;
  evidence: Array<{ label: string; value: string }>;
  news?: Array<{
    title: string;
    summary?: string;
    source?: string;
    sentiment?: string;
  }>;
};
```

Response data:

```ts
type ExplainCoachView = {
  modeReasoning: string;
  expectedReturn: {
    lowPercent: number;
    highPercent: number;
    timeframe: string;
    rationale: string;
  };
  keyDrivers: string[];
  risks: string[];
  newsSummary: string[];
  disclaimer: string;
  generatedAt: string;
  cached: boolean;
};
```

## Endpoint: POST /api/app/trade-preflight

Auth: required.

Backend dependency:

- `POST /api/trade-preflight`

Body: same as server `TradePreflightBody`.

Response data:

```ts
type TradePreflightView = {
  symbol: string;
  mode: "scalp" | "long_term";
  orderExecution: false;
  calculation: unknown;
  portfolioImpact: unknown;
  checklist: Array<{
    key: string;
    passed: boolean;
    label: string;
    severity: "ok" | "warning";
  }>;
  warnings: unknown[];
  dataFreshness: unknown;
};
```

## Endpoint: GET /api/app/behavior-coach

Auth: required.

Backend dependency:

- `GET /api/behavior-coach`

Response data:

```ts
type BehaviorCoachView = {
  status: "insufficient_data" | "active" | "stable";
  tags: string[];
  cards: Array<{
    id: string;
    title: string;
    message: string;
    severity: "warning" | "danger";
    confidence: number | null;
  }>;
  recommendedRules: string[];
  evidence: unknown;
};
```

## Phase 2 Endpoints

| Endpoint | Method | Backend | Status |
|---|---|---|---|
| `/api/app/ai-coach/profile` | GET | `GET /api/ai-coach/profile` | implemented |
| `/api/app/ai-coach/profile` | PATCH | `PATCH /api/ai-coach/profile` | implemented |
| `/api/app/ai-coach/feedback` | POST | `POST /api/ai-coach/feedback` | implemented |
| `/api/app/ai-coach/explain` | POST | `POST /api/ai-coach/explain` | implemented |
| `/api/app/profit-plan` | GET | `GET /api/profit-plan` | implemented |
| `/api/app/signal-performance` | GET | `GET /api/signal-performance` | implemented |
| `/api/app/ai-coach/detail` | GET | `GET /api/market-intelligence/:symbol/news` 병합 | implemented |

## File Placement

| Concern | Files |
|---|---|
| AI coach app route | `src/rest/routes/ai-coach.routes.ts` |
| AI coach controller | `src/rest/controllers/ai-coach.controller.ts` |
| AI coach service | `src/services/app-ai-coach.service.ts` |
| Trade preflight route/controller/service | `src/rest/routes/trade-preflight.routes.ts`, `src/rest/controllers/trade-preflight.controller.ts`, `src/services/app-trade-preflight.service.ts` |
| Behavior coach route/controller/service | `src/rest/routes/behavior-coach.routes.ts`, `src/rest/controllers/behavior-coach.controller.ts`, `src/services/app-behavior-coach.service.ts` |
| App registration | `src/rest/app.ts` |

## DecisionCard

```ts
type DecisionCard = {
  mode: "scalp" | "long_term";
  label: string;
  action: string;
  confidence: number;
  riskLevel: string;
  timeframe: string;
  headline: string;
  reasons: string[];
  risks: string[];
  score: number;
};
```
