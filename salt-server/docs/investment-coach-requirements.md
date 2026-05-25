# Investment Coach Server Requirements

## Scope

- 1차 서버 범위는 crypto/Upbit 기반 투자 코치 API다.
- 한국 주식 실시간 조회, KIS, 키움, Toss, `/api/stock/*`는 제외한다.
- SALT 서버는 매수/매도/정정/취소 주문을 실행하지 않는다.
- 서버는 판단 보조, 리스크 계산, 행동 분석, 데이터 최신성 표시를 담당한다.

## Phase 1 Requirements

| ID | Scope | Requirement | Acceptance |
|---|---|---|---|
| SRV-REQ-001 | [api] | AI 코치 조회가 `symbol`, `mode`, `preview` query를 지원한다. | `GET /api/ai-coach?symbol=BTC&mode=scalp&preview=true`가 선택 종목 판단을 반환한다. |
| SRV-REQ-002 | [api] | AI 코치 생성이 선택 `symbol`, `mode` body를 지원한다. | `POST /api/ai-coach/generate` payload에 `mode`, `symbol`, `dualDecision`, `missingData`, `dataFreshness`가 포함된다. |
| SRV-REQ-003 | [module] | 단타/장기 듀얼 판단을 계산한다. | `dualDecision.scalp`, `dualDecision.longTerm`이 각각 `label`, `action`, `confidence`, `riskLevel`, `timeframe`, `reasons`, `risks`를 가진다. |
| SRV-REQ-004 | [api] | 외부 주문 전 체크를 계산한다. | `POST /api/trade-preflight`가 손익비, 최대 손실, 예상 비중, 체크리스트, 경고를 반환한다. |
| SRV-REQ-005 | [module] | 포트폴리오 비중 영향을 계산한다. | 보유 종목과 신규 종목 모두 추가 진입 후 예상 비중을 계산한다. |
| SRV-REQ-006 | [api] | 행동 코치를 제공한다. | `GET /api/behavior-coach`가 `insufficient_data`, `active`, `stable` 상태를 구분한다. |
| SRV-REQ-007 | [auth] | 사용자별 데이터는 인증 사용자 기준으로 제한한다. | 모든 신규 route는 `authMiddleware`를 사용한다. |
| SRV-REQ-008 | [docs] | 주문 실행과 한국 주식은 1차 범위에 포함하지 않는다. | 신규 route/env/provider에 주문 실행, KIS, 키움, `/api/stock/*`가 없다. |

## Phase 2 Requirements

| ID | Scope | Requirement | Proposed Endpoint |
|---|---|---|---|
| SRV-REQ-201 | [api] | 투자 성향/온보딩 프로필 조회 및 저장 | `GET/PATCH /api/ai-coach/profile` 구현 |
| SRV-REQ-202 | [api] | 보유 종목 익절/손절 플랜 | `GET /api/profit-plan?symbol=` 구현 |
| SRV-REQ-203 | [worker] | 코치 판단 변화 알림 생성 | 코치 생성 시 이전 action과 달라지면 `InvestmentNotification(type=decision_change)` 생성 |
| SRV-REQ-204 | [api] | 종목별 뉴스 근거 3개 제공 | `GET /api/market-intelligence/:symbol/news` 구현 |
| SRV-REQ-205 | [api] | 신호 성과 추적 | `GET /api/signal-performance` 구현 |
| SRV-REQ-206 | [api] | 코치 피드백 기록 | `POST /api/ai-coach/feedback` 구현 |
| SRV-REQ-207 | [module] | data freshness/confidence 표준화 | AI coach/preflight response에 부분 구현 |
| SRV-REQ-208 | [api] | Gemini 기반 코치 해설 | `POST /api/ai-coach/explain` 구현 |

## AI Coach Explainer Requirements

| ID | Scope | Requirement | Acceptance |
|---|---|---|---|
| SRV-EXPLAINER-001 | [api] | Gemini 기반 AI 코치 해설 endpoint를 제공한다. | `POST /api/ai-coach/explain`가 `symbol`, `koreanName`, `mode`, 가격/거래대금, `confidence`, `evidence`, `news` body를 검증한다. |
| SRV-EXPLAINER-002 | [llm] | Gemini에 전달하는 prompt는 제공된 데이터만 근거로 해설하도록 제한한다. | system instruction에 데이터 외 추측 금지, 매수/매도 직접 권유 금지, 수익 보장 금지가 포함된다. |
| SRV-EXPLAINER-003 | [contract] | Gemini 응답은 서버 계약에 맞는 JSON으로 정규화한다. | 응답에 `modeReasoning`, `expectedReturn.lowPercent/highPercent/timeframe/rationale`, `keyDrivers`, `risks`, `newsSummary`, `disclaimer`, `generatedAt`, `cached`가 포함된다. |
| SRV-EXPLAINER-004 | [cache] | 동일한 해설 요청의 LLM 비용과 지연을 줄인다. | `symbol`, `mode`, 가격 bucket, 24h 변동률 bucket, 뉴스 title hash 기준으로 5분 in-memory cache를 사용하고 cache hit 시 `cached=true`를 반환한다. |
| SRV-EXPLAINER-005 | [policy] | 투자 자문/주문 실행으로 오해될 표현을 막는다. | 해설은 판단 보조 문구로 제한하고 주문 실행 객체, 주문 상태, 매수/매도 확정 지시를 만들지 않는다. |
| SRV-EXPLAINER-006 | [config] | Gemini 설정은 환경변수로 분리한다. | `GEMINI_API_KEY`, `GEMINI_MODEL`을 사용하며 API key는 로그/응답에 노출하지 않는다. |
| SRV-EXPLAINER-007 | [error] | LLM 응답 파싱 실패를 명확히 처리한다. | Gemini 응답이 JSON으로 파싱되지 않으면 explainer service가 파싱 실패 에러를 발생시키고 error middleware로 전달한다. |
| SRV-EXPLAINER-008 | [security] | 프로토타입 public endpoint의 운영 전환 조건을 명시한다. | 현재는 prototype demo용 public이며 production 전 auth 또는 rate-limit 적용 TODO가 route/spec에 남아 있다. |

## Non-Requirements

- 국내 주식 실시간 시세.
- KIS/키움/Toss provider.
- 주문 실행, 자동매매, 거래소/증권사 주문 연동.
- 신규 DB 모델 추가. 1차는 기존 `InvestmentInsight`, `PortfolioHolding`, `PortfolioTransaction`, `MarketAsset`, `MarketSentiment`, `TechnicalIndicator`, `WhaleTransaction`을 사용한다.

## Validation

- `npm run build`가 최종 통과해야 production-ready다.
- 현재 레포에는 신규 기능과 무관한 기존 TypeScript 오류가 남아 있어 server build가 실패한다.
