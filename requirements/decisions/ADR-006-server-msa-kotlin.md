# ADR-006 — 서버를 도메인 서비스로 나누고 Spring Boot · Kotlin 으로 옮긴다

- 상태: **채택 (사용자 결정)**
- 날짜: 2026-10-30
- 대체: 루트 `CLAUDE.md` 표의 서버 방법론(Express · TS · DDD 컨텍스트) — 전환 기간 동안 공존
- 관련: `ADR-005` · 설계 `salt-server/docs/2026-10-30-msa-kotlin-migration.html` · `SRV-REQ-043`~`049` · `DB-REQ-036` · `BFF-REQ-045`

> 사용자 결정(2026-10-30): *"서버도 msa 해야하고 스프링 코틀린 으로 이전 계획도 적어줘"*

## 1. 결정

서비스 경계 = 도메인 경계. **8개 서비스 + 이미 분리된 forecast(Python)**.

| 서비스 | 지금 코드 | 줄 수(테스트 제외) | 단계 |
|---|---|---|---|
| `savings` | `modules/goals` → 신규 | 601 | S1 |
| `household` | 신규 | 0 | S1 |
| `content` | 신규(금융 팁 · 제도 파라미터) | 0 | S2 |
| `notification` | `notification` | 587 | S2 |
| `identity` | `auth` · `modules/user` · `onboarding` | 1,746 | S3 |
| `portfolio` | `portfolio` | 1,966 | S4 |
| `market` | `market` · `news` + 수집 워커 | 12,289 | S5 |
| `coach` | `coach` · `modules/investment-insight` | 23,049 | S6 |
| — | `modules/mission` · `dashboard` · `feed` (동면 410) | 990 | 옮기지 않는다 |

- **BFF 는 Node 로 유지한다.** 프론트 계약(뷰모델 · SSE · 시세 WebSocket)을 지키는 층이라 뒤가 바뀌어도 프론트는 모른다.
- **코드 경계는 처음부터 MSA, 프로세스 경계는 필요할 때.** S0~S2 는 Gradle 멀티모듈 한 프로세스(Spring Modulith 로 경계 검증).
  분리 신호: 장애 격리(수집 워커 — S5 에서 무조건) · 확장 특성(코치 LLM 대기) · 배포 주기(content).
- 이전은 **스트랭글러**: 골든 JSON 녹화 → Kotlin 구현 → 그림자 실행 비교 → BFF 경로 스위치 → 1주 관찰 뒤 옛 코드 삭제.

## 2. 스택

Kotlin 2.2+ · Spring Boot 4.x(Spring Framework 7) · JDK 21 가상 스레드 · Gradle Kotlin DSL 멀티모듈(서비스마다
`domain` · `application` · `infrastructure` · `api`) · Spring Modulith + ArchUnit · jOOQ · Flyway · springdoc-openapi ·
SseEmitter · `@Scheduled` + ShedLock · Resilience4j · Spring AI(`CoachExplainer` 포트 뒤) · identity JWKS + 리소스 서버 ·
JUnit 5 · Kotest · Testcontainers · Micrometer + OpenTelemetry · Docker Compose · RabbitMQ(재생 필요 시 Kafka) · 트랜잭셔널 아웃박스.

## 3. 데이터

- 테이블 하나에 주인 하나. 서비스마다 스키마 + DB 계정. 다른 스키마 권한 없음(`DB-REQ-036`).
- 경로를 Kotlin 으로 넘길 때 그 테이블의 DDL 주인도 Prisma → Flyway 로 넘긴다.
- forecast 의 `public` 직접 읽기 4곳은 market · coach 의 export 뷰로(`ADR-007`).
- 금액은 `BigDecimal`(NUMERIC 정밀도 유지). 판정 원장 불변 트리거는 DB 에 있어 언어와 무관하게 유지.

## 4. 선택하지 않은 것

| 안 | 왜 아닌가 |
|---|---|
| 한 번에 다시 쓰기(빅뱅) | 되돌릴 지점이 없다. 투자 기능이 이전 기간 동안 멈춘다 |
| Express 유지 + 서비스만 분리 | 사용자 결정으로 Kotlin. 금액 · 원장 도메인에서 컴파일러가 모듈 의존을 막는 이득 |
| 서비스마다 처음부터 프로세스 분리 | 1인 · 맥 한 대에서 운영 비용이 코드보다 크다 |
| BFF 도 Kotlin / Spring Cloud Gateway | 뷰모델 조립 위치 문제가 다시 열린다. 프론트 TS 타입 공유를 잃는다 (Open Question 으로 남김) |

## 5. 결과와 위험

- 이중 언어 기간(S1~S6) 동안 규칙 · 훅 · 테스트가 두 벌 — 단계가 끝나면 옛 코드를 바로 지운다.
- `salt-server/.claude/rules/**` 의 Kotlin 판이 필요하다(`SRV-REQ-043`). 200줄 상한 그대로.
- 배포 환경: launchd `com.salt.server` → Docker Compose(S7). 관리형 호스팅은 별도 결정.
- 제품 공통 수용 기준은 그대로 — 주문 코드 경로 0 · 금액은 서버 · 근거 3종 · 확신 표현 0.

## 6. 되돌리기

단계마다 BFF 라우팅 스위치 하나로 옛 서버로 돌아간다(`BFF-REQ-045`). 옛 코드 삭제는 1주 관찰 뒤라 그 전에는 비용이 없다.
