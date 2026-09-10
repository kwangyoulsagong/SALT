---
id: SRV-REQ-025
feature: F004
area: srv
kind: API
title: "F004 AI 코치 추천 — REST 계약 정의 (기존 5경로 확장 · 렌더 게이트 필드)"
priority: critical
labels: [api, rest, contract, coach, render-gate]
created: 2026-09-09
---

## Summary

**기존 경로를 유지하고 필드를 추가**한다. F004는 새 엔드포인트가 적고, 대신 **렌더 게이트 필드**(`renderable`·`blockedReason`)와 **3종 세트**(`signalTrackRecord`·`failureCases`)를 응답에 추가하는 것이 핵심이다.

## 엔드포인트

### 기존 (필드 추가)

| Method | Path | 추가 필드 |
|---|---|---|
| GET | `/api/ai-coach` (`?symbol&mode&preview`) | `renderable` · `blockedReason` · `signalTrackRecord` · `failureCases` · `scoreNote` · `excluded[]` · `staleHours` |
| POST | `/api/ai-coach/generate` | **쿨다운 429** + `retryAfterSeconds` |
| GET/PATCH | `/api/ai-coach/profile` | `defaultMode`·`notificationLevel` **실제 영속화**(`unsupportedPersistedFields` 제거) |
| POST | `/api/ai-coach/feedback` | `reasonCode` 4종 |
| POST | `/api/ai-coach/explain` | **인증 추가**(현재 public + TODO 주석) + rate limit |
| GET | `/api/profit-plan` | `distanceFromCurrentPct` · 3자산군 지원 |
| GET | `/api/signal-performance` | `?groupBy=signalType` · `lowSample` |
| POST | `/api/trade-preflight` | 변경 없음 (게이트 필드 추가 금지) |
| GET | `/api/behavior-coach` | `factCode` + `params` 추가 (기존 필드 유지) |

### 신규

| Method | Path | 용도 |
|---|---|---|
| GET | `/api/coach/detail` | 코치 상세 조립 (추천 + 성적표 + 실패이력 + 익절 + 행동기록 + 후보) |
| GET | `/api/coach/scoreboard` | 신호 유형별 성적표 표 |
| GET | `/api/coach/generation-status` | 마지막 생성 시각 · 쿨다운 남은 시간 |

## 응답 계약

```ts
type CoachDetailResult = {
  generatedAt: string | null;
  staleHours: number | null;
  regime: string | null;                  // market.regime

  recommendation: {
    action: 'buy' | 'sell' | 'hold' | 'rebalance';
    symbol: string;
    assetType: 'crypto' | 'us_stock';     // kr_stock 은 제외된다
    score: number;                        // 0~100
    scoreNote: string;                    // "점수는 확률이 아닙니다"

    renderable: boolean;                  // 3종 세트 게이트 결과
    blockedReason: 'reasons_missing' | 'signal_track_record_missing' | 'failure_cases_missing' | null;

    reasons: Array<{ type: string; message: string; value?: number | string | null }>;
    topFactors: Array<{ key: string; score: number; message: string }>;

    signalTrackRecord: {
      signalType: string; sample: number; winRate: number;
      avgReturn: number; maxDrawdown: number; lowSample: boolean;
    } | null;

    failureCases: Array<{ date: string; event: string; outcome: string }>;

    explanation: { text: string; source: 'llm' | 'rule' };
  } | null;

  risks: Array<{ type: string; symbol?: string; message: string; severity: number }>;
  candidates: Array<{ action: string; symbol: string; score: number; reasons: string[] }>;   // 상위 3

  exitPlans: Array<{
    symbol: string; assetType: string; currentPrice: number;
    stopLoss: { price: number; distancePct: number };
    firstTakeProfit: { price: number; distancePct: number };
    trendHold: { conditionCode: string };
  }>;

  behaviorFacts: Array<{ factCode: string; params: Record<string, string | number>; amountKrw: number | null }>;

  excluded: Array<{ assetType: 'kr_stock'; reasonCode: string }>;
  disclaimer: string;
};
```

## 규약

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **`renderable`과 `blockedReason`을 항상 포함**한다. 화면이 게이트를 우회할 수 없게 | Must |
| FR-2 | `renderable: false`여도 **200**이다. 에러가 아니다 | Must |
| FR-3 | `signalTrackRecord`가 `null`일 수 있다. 그 경우 `renderable: false`다 | Must |
| FR-4 | `failureCases`가 빈 배열일 수 있다. 그 경우 `renderable: false`다 | Must |
| FR-5 | **`scoreNote`를 항상 포함**한다 | Must |
| FR-6 | **`disclaimer`를 항상 포함**한다 | Must |
| FR-7 | `excluded[]`에 `kr_stock` 제외 사실을 담는다 | Must |
| FR-8 | `behaviorFacts`는 **`factCode` + `params`** 다. **완성된 문장을 주지 않는다** | Must |
| FR-9 | `trendHold.conditionCode`는 코드다. 문구는 프론트 | Must |
| FR-10 | `POST /api/ai-coach/generate`가 쿨다운 중이면 **429 + `retryAfterSeconds`** | Must |
| FR-11 | `POST /api/ai-coach/explain`에 **인증을 추가**한다. 현재 public이고 `TODO: add rate-limit + auth` 주석이 있다 | Must |
| FR-12 | `explain`에 rate limit을 둔다. LLM 호출이 비용이다 | Must |
| FR-13 | `profile`의 `defaultMode`·`notificationLevel`이 **실제 영속화**된다. `unsupportedPersistedFields`를 제거한다 | Must |
| FR-14 | `POST /api/trade-preflight`에 **게이트·차단 필드를 추가하지 않는다.** 계산 표시 전용 | Must |
| FR-15 | `GET /api/signal-performance?groupBy=signalType`을 추가한다. 기존 무인자 호출은 **하위 호환** | Must |
| FR-16 | `GET /api/profit-plan`에 `distanceFromCurrentPct`를 추가한다. 기존 필드를 제거하지 않는다 | Must |
| FR-17 | `GET /api/behavior-coach`에 `factCode`·`params`를 **추가**한다. 기존 응답을 유지한다 | Must |
| FR-18 | `staleHours`를 계산해 담는다. 화면이 `생성 후 27시간 경과` 배지를 만든다 | Must |
| FR-19 | 금액은 원 단위 정수 | Must |
| FR-20 | Swagger를 갱신한다. **`explain`의 public 표시를 제거**한다 | Must |

## 하위 호환

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 기존 5경로의 응답에 **필드 추가만** 한다. 제거·이름 변경 0건 | Must |
| FR-31 | 프론트가 아직 없는 경로이므로 **파괴적 변경이 안전하지만**, BFF가 이미 프록시하고 있으므로 계약 테스트를 둔다 | Must |
| FR-32 | `explain`에 인증을 추가하면 **BFF 프록시가 토큰을 전달해야 한다.** BFF 변경이 짝이다 | Must |

## Acceptance Criteria

- [ ] 신규 3경로가 등록되고 기존 9경로가 확장된다
- [ ] **`renderable`·`blockedReason`이 모든 추천 응답에 있다**
- [ ] `renderable: false`가 200이다
- [ ] `signalTrackRecord`를 null로 만들면 `renderable: false`이고 `blockedReason: 'signal_track_record_missing'`이다
- [ ] `failureCases`를 빈 배열로 만들면 `renderable: false`다
- [ ] `scoreNote`·`disclaimer`가 항상 있다
- [ ] `excluded[]`에 `kr_stock`이 있다
- [ ] `behaviorFacts`가 `factCode` + `params`이고 **완성 문장이 0건이다**
- [ ] `trendHold.conditionCode`가 코드다
- [ ] **5분 내 재생성이 429 + `retryAfterSeconds`다**
- [ ] **`POST /api/ai-coach/explain`이 인증을 요구한다**
- [ ] `explain`에 rate limit이 있다
- [ ] `profile`의 `defaultMode`·`notificationLevel`이 영속화되고 `unsupportedPersistedFields`가 0건이다
- [ ] `trade-preflight`에 게이트·차단 필드가 0건이다
- [ ] `signal-performance?groupBy=signalType`이 동작하고 무인자 호출이 하위 호환이다
- [ ] `profit-plan`에 `distanceFromCurrentPct`가 있고 기존 필드가 유지된다
- [ ] `behavior-coach`에 `factCode`·`params`가 추가되고 기존 응답이 유지된다
- [ ] `staleHours`가 계산된다
- [ ] 금액이 전부 정수다
- [ ] Swagger에서 `explain`의 public 표시가 제거되었다
- [ ] 기존 경로 응답 스냅샷이 하위 호환이다

## Dependencies

- **선행:** `SRV-REQ-024`(도메인) · `DB-REQ-017`~`020`
- **짝:** `BFF-REQ-025`(F004 UPSTREAM)가 `explain` 인증 전달을 담당
- **규칙:** `ddd-presentation.md` · `api-contract.md`

## Open Questions

- `GET /api/coach/detail`을 새로 만들지 기존 `/api/ai-coach`를 확장할지. **새로 만드는 것이 깨끗하지만** BFF가 이미 `/api/ai-coach`를 부르고 있다 → **기존 확장 + 신규 병행**이 기본안.
- `explain`에 인증을 추가하면 **PM 프로토타입이 깨진다**(현재 public으로 데모용). 프로토타입을 어떻게 할지 결정 필요.
- `staleHours` 임계(24h)와 워커 생성 주기의 정합. 워커가 6시간마다 생성하면 `staleHours`가 24를 넘지 않는다.
