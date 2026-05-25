# Investment Coach BFF Requirements

## Scope

- BFF는 프론트 화면 계약을 제공한다.
- 서버 raw payload를 그대로 전달하지 않고 preview/detail/card/checklist view model로 변환한다.
- 한국 주식 실시간 조회, KIS, 키움, Toss, `/api/stock/*`는 1차와 2차 모두 별도 PoC 전까지 제외한다.

## Phase 1 Requirements

| ID | Scope | Requirement | Acceptance |
|---|---|---|---|
| BFF-REQ-001 | [rest] | 코치 프리뷰 endpoint를 제공한다. | `GET /api/app/ai-coach/preview?symbol=BTC`가 sidebar용 view model을 반환한다. |
| BFF-REQ-002 | [rest] | 코치 상세 endpoint를 제공한다. | `GET /api/app/ai-coach/detail?symbol=BTC&mode=scalp`가 상세 화면 view model을 반환한다. |
| BFF-REQ-003 | [backend] | 서버 AI 코치 API를 호출한다. | Backend `/ai-coach?symbol=&mode=&preview=true` 응답을 화면 계약으로 변환한다. |
| BFF-REQ-004 | [rest] | 외부 주문 전 체크 endpoint를 제공한다. | `POST /api/app/trade-preflight`가 UI severity가 포함된 checklist를 반환한다. |
| BFF-REQ-005 | [rest] | 행동 코치 endpoint를 제공한다. | `GET /api/app/behavior-coach`가 status, tags, cards, recommendedRules를 반환한다. |
| BFF-REQ-006 | [docs] | 한국 주식 route를 추가하지 않는다. | BFF에 `/api/stock/*`, KIS, 키움 관련 route/env/provider가 없다. |
| BFF-REQ-007 | [compat] | 기존 proxy API를 유지한다. | 기존 `/api/ai-coach`, `/api/ai-coach/generate`, market route가 유지된다. |

## Phase 2 Requirements

| ID | Scope | Requirement | Proposed Endpoint |
|---|---|---|---|
| BFF-REQ-201 | [rest] | 코치 온보딩/성향 view model | `GET/PATCH /api/app/ai-coach/profile` 구현 |
| BFF-REQ-202 | [rest] | 익절/손절 플랜 카드 | `GET /api/app/profit-plan?symbol=` 구현 |
| BFF-REQ-203 | [rest] | 판단 변화 알림을 코치 상세와 병합 | 서버가 `decision_change` 알림 생성, BFF는 existing alerts route로 제공 |
| BFF-REQ-204 | [backend] | 종목 뉴스 근거 3개 병합 | detail response `evidence.news` 구현 |
| BFF-REQ-205 | [rest] | 신호 성과 카드 | `GET /api/app/signal-performance` 구현 |
| BFF-REQ-206 | [rest] | 코치 피드백 전달 | `POST /api/app/ai-coach/feedback` 구현 |
| BFF-REQ-207 | [rest] | data freshness badge/message 표준화 | preview/detail/preflight에 부분 구현 |
| BFF-REQ-208 | [rest] | Gemini 코치 해설 전달 | `POST /api/app/ai-coach/explain` 구현 |

## AI Coach Explainer Requirements

| ID | Scope | Requirement | Acceptance |
|---|---|---|---|
| BFF-EXPLAINER-001 | [rest] | 프론트가 Gemini 해설을 요청할 수 있는 app endpoint를 제공한다. | `POST /api/app/ai-coach/explain`가 `symbol`, `koreanName`, `mode`, 가격/거래대금, `confidence`, `evidence`, `news` body를 받는다. |
| BFF-EXPLAINER-002 | [backend] | BFF는 해설을 직접 생성하지 않고 서버 explainer endpoint로 위임한다. | BFF service가 `POST /api/ai-coach/explain`를 호출하고 서버 응답의 `data`를 app response로 반환한다. |
| BFF-EXPLAINER-003 | [contract] | 화면이 바로 쓸 수 있는 해설 view model을 유지한다. | 응답에 `modeReasoning`, `expectedReturn`, `keyDrivers`, `risks`, `newsSummary`, `disclaimer`, `generatedAt`, `cached`가 포함된다. |
| BFF-EXPLAINER-004 | [policy] | 해설 endpoint는 주문 실행이나 매수/매도 확정 CTA를 만들지 않는다. | BFF response에는 주문 상태, 주문 ID, 거래소 딥링크, 자동 주문 관련 필드가 없다. |
| BFF-EXPLAINER-005 | [security] | 프로토타입 public endpoint의 운영 전환 조건을 명시한다. | 현재는 prototype demo용 public이며 production 전 auth 또는 rate-limit 적용 TODO가 spec/route 주석에 남아 있다. |
| BFF-EXPLAINER-006 | [error] | 서버/Gemini 장애 시 민감한 내부 정보를 노출하지 않는다. | backend error는 BFF error middleware 흐름으로 넘기고 API key, prompt 원문, stack trace를 응답하지 않는다. |

## Non-Requirements

- BFF WebSocket 변경.
- BFF worker 변경.
- 국내 주식 시세 route.
- 주문 실행 route.

## Validation

- `npm run build` must pass.
- Backend 장애 시 BFF는 error middleware 흐름으로 넘기고, 민감한 backend details를 노출하지 않는다.
