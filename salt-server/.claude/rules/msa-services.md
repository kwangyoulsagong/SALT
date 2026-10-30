---
globs: salt-server/**, salt-platform/**
---

# MSA — 서버 REQ 를 구현할 때 먼저 정하는 것

근거: `ADR-006`(서비스 = 도메인 · Kotlin 스트랭글러) · `SRV-REQ-043`(플랫폼) · `SRV-REQ-044`(이벤트 · 아웃박스) ·
`SRV-REQ-049`(투자 이전) · `DB-REQ-036`(서비스별 스키마) · `BFF-REQ-045`(라우팅 스위치). 설계 `salt-server/docs/2026-10-30-msa-kotlin-migration.html`.
이 문서는 **새 결정을 만들지 않는다** — 위 문서와 어긋나면 위 문서가 맞고 이 문서를 고친다.

> 전환 기간(S0~S7)에는 Express(`salt-server/src`, `server-architecture.md`)와 Kotlin(`salt-platform/`)이 공존한다.
> Express 쪽 층 · 레지스트리 규칙은 그대로이고, 이 문서는 그 위에 **서비스 경계**를 얹는다.

## 1. 착수 전 네 질문 — plan 단계에서 답을 적는다

| 질문 | 어디서 답을 찾나 | plan 에 적을 것 |
|---|---|---|
| ① 이 REQ 는 어느 서비스 것인가 | §2 표 | 서비스 이름 하나. 둘이면 REQ 를 나눈다 |
| ② 그 서비스는 지금 어느 단계인가 | §2 단계 열 · 마스터 인덱스 §4-1 순위 3a | Express 에 쓰는가 Kotlin 에 쓰는가(§3) |
| ③ 읽고 쓰는 테이블의 주인은 누구인가 | `DB-REQ-036` 부록 주인 표 | 내 서비스 테이블만 쓰는가. 남의 것을 읽으면 §5 의 어느 방식인가 |
| ④ BFF 계약이 바뀌는가 | `BFF-REQ-045` · 지금 응답 모양 | "BFF 무변경"이 기본 합격 기준. 바뀌면 짝 REQ |

답을 못 하면 구현을 시작하지 않는다 — 대개 REQ 가 서비스 둘에 걸쳐 있다는 뜻이다.

## 2. 서비스 레지스트리 (`ADR-006` §1)

| 서비스 | 지금 코드(Express 컨텍스트 · 모듈) | 스키마 | 단계 | 이전 REQ |
|---|---|---|---|---|
| `savings` | `modules/goals` (`goal`) | `savings` | S1 | `SRV-REQ-045` |
| `household` | 없음 — 새로 | `household` | S1 | `SRV-REQ-046` |
| `content` | 없음 — 새로(금융 팁 · 제도 파라미터) | `content` | S2 | `SRV-REQ-047` |
| `notification` | `notification` | `notification` | S2 | `SRV-REQ-048` |
| `identity` | `auth` · `modules/user` · `onboarding` | `identity` | S3 | `SRV-REQ-048` |
| `portfolio` | `portfolio` | `portfolio` | S4 | `SRV-REQ-049` FR-1 |
| `market` | `market` · `news` + 수집 워커 | `market` | S5 | `SRV-REQ-049` FR-2 · 3 |
| `coach` | `coach` · `modules/investment-insight` | `coach` | S6 | `SRV-REQ-049` FR-4 · 5 |
| `forecast` | Python `salt-forecast` (이미 분리) | `forecast` | — | `ADR-004` · `ADR-007` |
| — | `modules/mission` · `dashboard` · `feed` (동면 410) | — | 옮기지 않음 | `SRV-REQ-049` FR-6 |

- 이 표에 없는 컨텍스트(`plan` · `indicator` · `fx` · `device` · `homebriefing` 등)를 건드리는 REQ 는 **착수 전에 `ADR-006` §1 표에 행을 더한다.** 여기서 먼저 정하지 않는다
- 서비스 이름 = 프론트 도메인 zone 이름 = BFF 경로 묶음(`ADR-005`). 새 이름을 지어내지 않는다

## 3. 어디에 쓰나 — 단계로 정한다

| 경우 | 쓰는 곳 |
|---|---|
| 새 도메인(`savings` · `household` · `content`)의 기능 | **처음부터 Kotlin.** Express 에 새 도메인 코드를 넣지 않는다 |
| 이전 전 서비스의 기능(예: S4 전 `portfolio`) | Express. 단 §4 · §5 금지를 지킨다 — 나중 이전을 막는 의존을 새로 만들지 않는다 |
| 이전 중(그림자 기간) 서비스 | **Kotlin 과 Express 양쪽**에 같은 변경 — 아니면 그림자 비교가 차이를 낸다. 가능하면 스위치 뒤로 미룬다 |
| 이전 끝난 서비스 | Kotlin 만. 옛 Express 코드는 이미 지워져 있어야 한다(§7) |

투자(`portfolio` · `market` · `coach`)는 **동결** — 기획된 것까지만(`MONEY-domains-global-plan.md`). 새 투자 기능 REQ 는 만들지 않는다.

## 4. 코드 경계 (`SRV-REQ-043` FR-2 · 3 · 4)

```
salt-platform/
├── shared-kernel/                Money(BigDecimal + 통화) · ErrorKind · Clock — 이것뿐
└── services/<name>/
    ├── domain/                   Spring · jOOQ 의존 0 (Gradle 의존으로 강제)
    ├── application/              유스케이스 하나 = 클래스 하나. 공개는 application.api 패키지만
    ├── infrastructure/           jOOQ · 외부 클라이언트 · 아웃박스 릴레이
    └── api/                      Spring MVC 컨트롤러 · springdoc
```

- 층 의미는 Express DDD 4층과 1:1 — `domain` · `application` · `infrastructure` · `presentation`(→ `api`). 규칙은 `ddd-*.md` 그대로 읽는다
- **다른 서비스의 클래스를 import 하지 않는다.** 공개 패키지 밖(`internal`) 접근은 Spring Modulith `verify()` · ArchUnit 이 빌드를 깬다
  (`layer-check.mjs` 의 Kotlin 판). 막히면 우회하지 말고 §5 의 통신 방식으로 바꾼다
- `shared-kernel` 에 도메인 개념을 올리지 않는다. 두 서비스가 같은 것을 원하면 한쪽이 주인이고 다른 쪽은 이벤트로 받는다
- **Express 쪽에서도**: 이전 예정 서비스 경계를 넘는 새 import 를 만들지 않는다. 지금 컨텍스트끼리 부를 땐 `{context}/application/api/` 만(`server-architecture.md`)

## 5. 서비스 간 데이터 — 직접 읽지 않는다 (`DB-REQ-036` · `SRV-REQ-044`)

**테이블 하나에 주인 하나.** 서비스마다 스키마 + DB 계정, 남의 스키마 권한 없음. 남의 데이터가 필요하면 아래에서 고른다.

| 필요 | 방식 | 규칙 |
|---|---|---|
| 남이 상태를 바꾼 걸 알아야 한다 | **이벤트**(아웃박스 → RabbitMQ) | 발행은 같은 트랜잭션에 `outbox` 행. 롤백이면 이벤트 0 |
| 남의 데이터를 자주 읽는다 | **프로젝션** — 이벤트로 내 스키마에 읽기 전용 사본 | 재구성 명령 하나를 같이 만든다 |
| 지금 바로 답이 필요한 조회 | **내부 REST**(서비스 토큰) + 타임아웃 · 서킷 | 실패하면 그 칸만 `degraded`. 동기 호출을 사슬로 잇지 않는다(한 단계) |
| 예측(Python)이 읽는다 | **export 뷰**(`market.v_*_export` · `coach.v_judgment_ledger_export`) | forecast 는 뷰만 읽는다(`ADR-007`) |

- **다른 스키마를 조인하는 쿼리를 새로 만들지 않는다.** 기존 것은 `DB-REQ-036` FR-3 목록에 있고 단계마다 줄어든다 — 그 목록을 늘리면 안 된다(Express 에서도)
- 이벤트 스키마는 루트 `contracts/events/<service>.<Event>.json`(JSON Schema) 한 곳. Kotlin · BFF · Python 이 같은 파일을 읽는다.
  새 이벤트 = 스키마 파일 + 발행 테스트(스키마와 다른 본문이면 실패)
- 구독자는 멱등 — `processed_event(event_id)`. 같은 이벤트 2회 = 결과 1회분. 재시도 3회 뒤 데드레터
- 이벤트 본문의 금액은 브로커 안에서만. **로그 · 추적 속성에 금액 0**
- DDL 주인은 Prisma 또는 Flyway 중 **하나**. 경로가 Kotlin 으로 넘어가는 단계에 그 테이블 DDL 도 Flyway 로 옮긴다
- 금액 열은 NUMERIC 그대로 · Kotlin `BigDecimal`(`Money`). 이동 중 타입 변경 0. 판정 원장 UPDATE 차단 트리거는 스키마를 옮겨도 남는다

## 6. BFF 계약 — 뒤가 바뀌어도 프론트는 모른다

- 응답 포맷 · 에러 바디 · `ErrorKind` → HTTP 매핑은 **Express 와 같은 모양**(`SRV-REQ-043` FR-6). 골든 JSON 차이 0 이 합격 기준
- BFF 는 Node 유지. 서비스 주소 · 라우팅(`legacy` | `platform` | `shadow`)은 BFF 설정 한 곳(`BFF-REQ-045`) — 서버 코드에 다른 서비스 주소를 박지 않는다
- 추적 ID 는 BFF 가 만들고 서비스가 이어받는다(OpenTelemetry). 인증은 S3 전까지 공용 HS, S3 뒤 JWKS(`SRV-REQ-048`)

## 7. 경로를 옮기는 절차 — 스트랭글러 (`ADR-006` §1 · `BFF-REQ-045`)

```
① 골든 JSON 녹화(옛 서버)  → ② Kotlin 구현 + 골든 테스트 → ③ BFF `shadow`(읽기 경로만 — 쓰기는 그림자 금지)
→ ④ 차이 리포트 1주 무차이 → ⑤ BFF 라우팅 `platform` → ⑥ 1주 관찰 → ⑦ 옛 Express 코드 · Prisma 모델 삭제
```

- 되돌리기 = BFF 라우팅 값 하나. ⑦ 전까지는 비용 없음
- **⑦ 을 미루지 않는다** — 이중 언어 기간이 길수록 규칙 · 테스트가 두 벌로 갈라진다. 단계 체크리스트에 "삭제한 줄 수"
- 계산 경로(평가금 · 평단 · 판정 엔진)는 그림자 비교를 소수점까지 · 판정 엔진은 백테스트 전수 동일(`SRV-REQ-049` FR-1 · 4)

## 8. 프로세스를 나누는 때

코드 경계는 처음부터 서비스, **프로세스 경계는 신호가 있을 때.** S0~S2 는 `salt-platform` 한 프로세스.
신호 셋 — 장애 격리(수집 워커: S5 `market-ingest` 는 무조건 분리) · 확장 특성(코치 LLM 대기) · 배포 주기(`content`).
신호 없이 프로세스를 나누지 않는다 — 1인 운영에서 운영 비용이 코드보다 크다.

## 9. 검증 — validate 에 더한다

| 무엇 | 명령 · 확인 |
|---|---|
| 경계 | `./gradlew check` — Modulith · ArchUnit 위반 0 |
| 데이터 권한 | 서비스 계정으로 남의 스키마 SELECT → 권한 오류 |
| 이벤트 | 롤백 시 이벤트 0 · 2회 전달 1회분 · 스키마 불일치 실패 |
| 계약 | 골든 JSON 차이 0(바꾼 경로) |
| Express 쪽 변경 | 기존 `npm test` · `build` · `test:layer-check` + 새 교차 스키마 조인 0(grep) |

## 10. 하지 않는 것

- ❌ 새 도메인 기능을 Express 에 — `savings` · `household` · `content` 는 Kotlin 에서 태어난다
- ❌ 남의 스키마 직접 조인 · 남의 테이블 쓰기 · 남의 서비스 클래스 import
- ❌ 서비스 사이 동기 호출 사슬 · 실패를 500 으로 올리기(그 칸만 `degraded`)
- ❌ 쓰기 경로 그림자 실행 · 스위치 뒤 옛 코드 방치
- ❌ 제품 공통 기준 완화 — 주문 코드 경로 0 · 금액은 서버 · 근거 3종 게이트 · 확신 표현 0 은 서비스가 바뀌어도 같다
