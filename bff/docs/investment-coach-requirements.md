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

## Non-Requirements

- BFF WebSocket 변경.
- BFF worker 변경.
- 국내 주식 시세 route.
- 주문 실행 route.
- 사용자 노출 전략/플레이북 route.

## Removed Runtime Surface

| 영역 | 제거 내용 | 이유 |
|---|---|---|
| Strategy/Playbook app API | `/api/app/playbooks` route/controller 삭제 | 전략 설정형 UX 제외 |
| Alerts aggregation | `/playbook-triggers` backend 호출 제거 | 판단 변화 알림은 investment notifications로 통합 |

## Validation

- `npm run build` must pass.
- Backend 장애 시 BFF는 error middleware 흐름으로 넘기고, 민감한 backend details를 노출하지 않는다.
