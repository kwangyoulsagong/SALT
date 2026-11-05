# 이벤트 계약 — `contracts/events/<service>.<Event>.json`

서비스 사이 사건의 **유일한 계약**이다(`SRV-REQ-044` FR-3 · `msa-services.md` §5). Kotlin · BFF(TS) · Python 이 이 파일을 읽는다.

| 규칙 | 왜 |
|---|---|
| 파일 이름 = 이벤트 이름 = 라우팅 키(`<service>.<Event>`) | 발행 코드 · 브로커 · 구독자가 같은 문자열 하나로 만난다 |
| JSON Schema 2020-12 · `additionalProperties: false` | 모르는 필드를 조용히 싣지 않는다. 필드 추가는 이 파일을 먼저 고친다 |
| 형식(uuid · 시각)은 `pattern` 으로 | 검증기(`networknt` 3.x)가 `format` 을 기본으로 검사하지 않는다 — `format` 만 적으면 통과한다 |
| 금액은 브로커 안에서만 | 로그 · 추적 속성에 금액 0(FR-5) |
| 발행 시점에 검증 | `salt-platform` `EventSchemas` 가 아웃박스 쓰기 전에 검사한다 — 어긋나면 업무 트랜잭션째 롤백 |

## 지금 있는 것

| 이벤트 | 발행 | 구독 | 단계 |
|---|---|---|---|
| `ping.PingRecorded` | `ping`(플랫폼 점검) | `ping` | S0 |
| `savings.GoalCreated` | `savings` | (S2 `content` 때맞춘 팁) | S1 |
| `savings.GoalReached` | `savings` | — | S1 |
| `savings.ProjectionIssued` | `savings` | (`FC-REQ-024` 채점) | S1 |
| `household.ExpenseRecorded` | `household` | (savings 지연 재계산 — ~~가계부 S1b~~ **정정 2026-11-04** 저축 S2: 목표 시계는 조회 API 로 충분) | S1 |
| `household.LandingIssued` | `household` | (`FC-REQ-024` 채점) | S1 |
| `household.MonthClosed` | `household` | (savings 속도 — 저축 S2) | 가계부 S1b |
| `household.ExpenseRecorded` `category` | `household` | (구독자 0) — 기본 12 또는 사용자 분류 키(이름 0) | 가계부 S1f 개정 |
| `household.FixedCostIncreased` | `household` | (S2 `content` 때맞춘 팁) — 가맹점 · 달마다 한 번 · 가맹점 이름 0 | 가계부 S1e |

`SRV-REQ-044` FR-4 의 첫 이벤트 13종은 **발행하는 서비스가 생기는 단계에** 이 표에 행과 파일을 더한다(S1 savings · household …).
본문 필드는 그 서비스 REQ 가 정한다 — 서비스보다 먼저 쓰면 짐작이다.
