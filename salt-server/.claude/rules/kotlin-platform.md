---
globs: salt-platform/**
---

# Kotlin 플랫폼 — `salt-platform/` 에서 서버 코드를 쓸 때

근거: `ADR-006` §2(스택) · `SRV-REQ-043`(S0 플랫폼, FR-1~13) · 서비스 경계는 `msa-services.md`.
**지금 코드는 없다** — `salt-platform/` 은 S0(`SRV-REQ-043`)에서 생긴다. 그 전까지 이 문서는 착수 기준이다.
Express 쪽(`salt-server/src`)은 기존 규칙 그대로다. 같은 뜻의 규칙은 **뜻을 옮기고 도구만 바꾼다** — §3 대응표.

## 1. 스택 — 이 표 밖의 라이브러리는 REQ 로 먼저

| 층 | 선택 |
|---|---|
| 언어 · 런타임 | Kotlin 2.2+ · JDK 21(가상 스레드 켬) |
| 프레임워크 | Spring Boot 4.x(Spring Framework 7) · Spring MVC |
| 빌드 | Gradle Kotlin DSL 멀티모듈 · 버전 카탈로그(`libs.versions.toml`) |
| 경계 검증 | Spring Modulith `verify()` + ArchUnit |
| 영속 | jOOQ(서비스 스키마별 코드 생성) · Flyway(서비스별 위치) |
| API 문서 | springdoc-openapi |
| 스트리밍 | `SseEmitter` |
| 스케줄 · 락 | `@Scheduled` + ShedLock(DB 락) |
| 외부 호출 | Resilience4j — 재시도 · 서킷 · 레이트 리미터 |
| LLM | Spring AI — `CoachExplainer` 포트 뒤에만 |
| 인증 | 리소스 서버(JWT). S3 전 공용 HS, S3 뒤 identity JWKS(`SRV-REQ-048`) |
| 메시징 | RabbitMQ + 트랜잭셔널 아웃박스(`SRV-REQ-044`) |
| 테스트 | JUnit 5 · Kotest · Testcontainers(Postgres · RabbitMQ) |
| 관측 | Micrometer + OpenTelemetry · JSON 로그 |
| 실행 | Docker Compose(로컬) · 같은 이미지로 관리형 컨테이너(`ADR-008`) |

Spring Boot 4 · Kotlin 2.2 의 실제 호환 조합은 S0 에서 확정한다(`MONEY-domains-global-plan.md` 열린 질문) — 확정 전 버전을 문서에 박지 않는다.

## 2. 모듈 구조와 의존 — 컴파일러가 막게 한다

```
salt-platform/
├── settings.gradle.kts · gradle/libs.versions.toml
├── shared-kernel/                 Money · ErrorKind · Clock
├── services/<name>/
│   ├── domain/                    의존: shared-kernel 만 (Spring · jOOQ 0)
│   ├── application/               의존: domain
│   ├── infrastructure/            의존: domain (+ jOOQ · 클라이언트)
│   └── api/                       의존: application
└── app/                           조립 · 실행(S0~S2 는 한 프로세스)
```

- **의존 금지는 Gradle 의존 선언으로 먼저 막는다.** `domain` 모듈 `build.gradle.kts` 에 Spring · jOOQ 가 없으면 import 자체가 안 된다.
  남는 것(서비스 간 `internal` 접근 · 층 위반)은 Modulith `verify()` + ArchUnit 테스트가 `./gradlew check` 에서 깬다
- `application` 과 `infrastructure` 는 서로 모른다 — 포트는 `domain` 에, 구현은 `infrastructure` 에, 꽂는 곳은 `app/` 조립 하나(Express `composition.ts` 와 같은 자리)
- **DI 는 생성자 주입만.** 필드 주입 · `lateinit` 주입 금지 — 무엇이 꽂혔는지 읽어서 알아야 한다
- 패키지: `com.salt.<service>.<layer>`. 밖에 여는 것은 `com.salt.<service>.application.api` 만, 나머지는 `internal`

## 3. Express 규칙 → Kotlin 대응

| 뜻 (Express 규칙) | Kotlin 에서 |
|---|---|
| 금액은 `Money` VO, 중간 반올림 금지 · 응답 직전 1회(`ddd-shared.md` §3) | `Money`(value class + 통화, `BigDecimal` — `SRV-REQ-043` FR-3. 값 둘을 드는 구현 형태는 S0 에서 정한다). `Double` 금액 0 · `toKrwInteger()` 는 `api` 층에서만 |
| `DomainError` + `ErrorKind` 7값, 매핑은 미들웨어 한 곳(`ddd-shared.md` §2) | `sealed class DomainError(code, kind)` + `@RestControllerAdvice` 하나. 값과 HTTP 매핑은 Express 와 같다 |
| 응답 envelope · 에러 바디(`api-contract.md`) | 같은 모양. 골든 JSON 이 비교한다(`msa-services.md` §6) |
| 유스케이스 = 동사 클래스 하나(`ddd-application.md` §1) | 같다. `class RecordExpense(…) { fun execute(cmd): … }` |
| 트랜잭션은 `application` 에만 · 외부 I/O 는 밖(`performance-server.md` §2) | `@Transactional` 은 `application` 유스케이스에만. LLM · 거래소 · 환율 호출은 트랜잭션 밖 → 짧은 쓰기 |
| 입력 검증은 presentation 에서 형식만(`ddd-presentation.md` §3) | `api` 층 요청 DTO 에서 형식 검증. 도메인 규칙은 도메인 · 유스케이스 |
| 도메인은 프레임워크를 모른다(`ddd-domain.md` §1) | `domain` 모듈에 어노테이션 0(`@Component` · `@Entity` 포함) |
| 조회는 Projection(`ddd-infrastructure.md` §3) | jOOQ 로 화면 모양 쿼리. 엔티티 전체를 읽어 합계 내지 않는다 |
| 워커는 스케줄 · 락만(`server-architecture.md` §7) | `@Scheduled` + `@SchedulerLock` 메서드는 유스케이스 한 번 호출만 |
| 외부 타임아웃 · 재시도 3회(`workers-external.md`) | Resilience4j 설정으로. 재시도는 조회(GET)에만 · KIS 는 레이트 리미터(약 2건/초) |
| 주문 · 출금 코드 0 · KIS 조회 TR 만 | 같다. "주문 클라이언트 0" 테스트를 Kotlin 쪽에도 둔다(`SRV-REQ-049` FR-2) |
| 410 동면 | Kotlin 으로 옮기지 않는다 — BFF 로(`BFF-REQ-045` FR-8) |

## 4. 영속

- jOOQ 코드는 **자기 서비스 스키마만** 생성 대상으로. 남의 스키마 테이블 클래스가 생기지 않게 한다(`msa-services.md` §5)
- Flyway 위치 `services/<name>/infrastructure/src/main/resources/db/migration/<schema>`. 첫 파일은 `V1__baseline.sql`(`DB-REQ-036` FR-5)
- 한 테이블이 Prisma 와 Flyway 양쪽 마이그레이션에 동시에 있지 않다 — 경로 이전 PR 에서 주인을 옮긴다
- 금액 열 NUMERIC 정밀도 그대로(`performance-database.md` §1 표). 컬럼 삭제 · 이름 변경 2단계 · drop 전 덤프는 그대로
- N+1 · 페이징 · 인덱스 · `EXPLAIN` 의무는 `performance-database.md` 그대로

## 5. 동시성

- 가상 스레드를 켜고 **블로킹 코드를 그대로 쓴다.** 코루틴 · 리액티브(WebFlux)를 섞지 않는다 — 한 프로세스에 두 모델이면 트랜잭션 · 추적 전파가 갈라진다
- `synchronized` 블록 안에서 I/O 하지 않는다(가상 스레드 고정). 필요하면 `ReentrantLock`
- 같은 사용자 계산 중복 실행 방지는 DB advisory lock(`pg_try_advisory_xact_lock`) — 지금 규칙 그대로

## 6. 보안 · 관측

- 비밀은 환경 변수 → 관리형 비밀 저장소(`ADR-008`). 이미지 · 저장소 · `application.yml` 에 비밀 0
- 설정은 `@ConfigurationProperties` + 기동 시 검증(빠진 필수 값이면 기동 실패). 비밀에 기본값 0
- 로그 · 추적 속성에 금액 · 토큰 · 개인 식별 정보 0(마스킹 규칙 지금 그대로). LLM 프롬프트 · 응답 원문 로깅 0
- 추적 ID 는 BFF 에서 이어받는다 — 새로 만들지 않는다

## 7. 테스트 · 검증

| 명령 | 무엇 |
|---|---|
| `./gradlew check` | 컴파일 · 단위 · Modulith · ArchUnit · Testcontainers 통합 — CI 명령은 이것 하나 |
| 경계 변이 | 위반 import 를 하나 넣으면 `check` 가 실패하는지 1회 확인(`SRV-REQ-043` 수용 기준) — 확인 뒤 사본으로 되돌린다 |
| 골든 JSON | 옮긴 경로의 Express 응답과 차이 0 |
| 금액 · 판정 | 소수점까지 비교 · 판정 엔진 백테스트 전수 동일(`SRV-REQ-049`) |

- DB 테스트는 Testcontainers 실 Postgres — 인메모리 DB 로 대신하지 않는다(트리거 · NUMERIC · 스키마 권한이 다르다)
- 테스트 이름은 한국어 문장 허용(Kotest `should`/백틱 함수명) — 수용 기준 문장과 맞춘다

## 8. 하지 않는 것

- ❌ `domain` 에 Spring · jOOQ · Jackson 어노테이션
- ❌ JPA/Hibernate — 영속은 jOOQ(`ADR-006` §2). 엔티티 매핑으로 도메인을 만들지 않는다
- ❌ `Double`/`Float` 금액 · 중간 반올림
- ❌ 코루틴 · WebFlux 혼용 · 필드 주입
- ❌ 서비스마다 다른 응답 · 에러 모양 — BFF 무변경이 합격 기준
- ❌ 이 문서 밖 라이브러리를 REQ 없이 추가
