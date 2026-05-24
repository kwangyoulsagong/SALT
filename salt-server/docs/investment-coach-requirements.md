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

## Non-Requirements

- 국내 주식 실시간 시세.
- KIS/키움/Toss provider.
- 주문 실행, 자동매매, 거래소/증권사 주문 연동.
- 사용자 노출 전략/플레이북 API와 차트 드로잉 API.
- 신규 DB 모델 추가. 1차는 기존 `InvestmentInsight`, `PortfolioHolding`, `PortfolioTransaction`, `MarketAsset`, `MarketSentiment`, `TechnicalIndicator`, `WhaleTransaction`을 사용한다.

## Removed Runtime Surface

| 영역 | 제거 내용 | 이유 |
|---|---|---|
| Strategy/Playbook API | `/api/playbooks`, `/api/playbookTriggerRoutes` route 등록 제거 및 playbook module 삭제 | 사용자가 전략을 직접 설정하는 UX는 투자 코치 방향에서 제외 |
| Playbook worker | `PlaybookEngineWorker` 자동 실행 제거 및 worker 파일 삭제 | 전략 룰 기반 자동 트리거 대신 AI 코치/알림으로 통합 |
| Chart drawing API | `/api/investment/drawings/*` route 등록 제거 및 drawing module 삭제 | 차트 드로잉은 1차/2차 투자 코치 핵심 범위가 아님 |
| Feed/Dashboard | playbook trigger 병합 제거 | 전략 트리거 노출 제거와 계약 일치 |

## Validation

- `npm run build`가 최종 통과해야 production-ready다.
- 현재 레포에는 신규 기능과 무관한 기존 TypeScript 오류가 남아 있어 server build가 실패한다.
