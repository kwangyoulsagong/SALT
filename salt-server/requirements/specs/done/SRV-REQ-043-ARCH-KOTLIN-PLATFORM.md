---
id: SRV-REQ-043
area: server
kind: ARCH
title: "S0 — Kotlin · Spring Boot 플랫폼(Gradle 멀티모듈 · Modulith · Compose · 규칙 Kotlin 판)"
priority: high
created: 2026-10-30
source: requirements/decisions/ADR-006-server-msa-kotlin.md
---

## Summary

서비스를 옮기기 전에 **옮길 곳**을 만든다. 새 디렉터리 `salt-platform/`(Gradle 멀티모듈) 위에 서비스 모듈을 올리고,
S0~S2 동안은 한 프로세스(모듈러 모놀리스)로 띄운다. 이 단계에서 기능은 0 — 빈 서비스 하나가 인증 · DB · 이벤트 · 관측을 통과하는 것이 합격선.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `salt-platform/` — Gradle Kotlin DSL · 버전 카탈로그. Kotlin 2.2+ · Spring Boot 4.x · JDK 21(가상 스레드 켬) |
| FR-2 | 서비스 모듈 = `services/<name>/{domain,application,infrastructure,api}`. `domain` 은 Spring · jOOQ 의존 0(Gradle 의존으로 강제). 지금 DDD 4층(`server-architecture.md` §3)과 1:1 |
| FR-3 | `shared-kernel` — `Money`(~~value class~~ **불변 일반 클래스 — 정정 2026-11-03**: value class 는 값 하나만 든다. 값 + 통화, `BigDecimal`, 값 비교는 `compareTo`) · `Quantity`(value class) · `ErrorKind`(현재 7값과 같은 HTTP 매핑) · `DomainError`(~~sealed~~ **abstract** — sealed 하위 타입은 같은 모듈에만) · `Clock` 포트(**= `java.time.Clock`**, 새 인터페이스를 만들지 않았다) |
| FR-4 | 경계 검증 — Spring Modulith `verify()` + ArchUnit(도메인 → 인프라 금지 · 서비스 간 `internal` 패키지 접근 금지). 빌드 실패로 막는다(지금 `layer-check.mjs` 대응) |
| FR-5 | 영속 — jOOQ 코드 생성(서비스 스키마별) · Flyway 서비스별 위치(`DB-REQ-036`) |
| FR-6 | API — Spring MVC + springdoc-openapi. 응답 포맷 · 에러 바디는 지금 Express 와 같은 모양(BFF 무변경이 합격 기준) |
| FR-7 | 인증 — 리소스 서버(JWT 검증). S3 전까지는 지금 공용 비밀키(HS) 검증, S3 에서 JWKS 로(`SRV-REQ-048`) |
| FR-8 | 스케줄 — `@Scheduled` + ShedLock(DB 락 — 서비스 스키마마다 `shedlock` 표, 첫 사용처 = 아웃박스 릴레이). 외부 호출 — Resilience4j(재시도 · 서킷 · 레이트 리미터) — ~~**S0 는 의존까지**: 외부 호출이 아직 없다. 설정 · 테스트는 첫 외부 호출(S5 `market` KIS · 거래소)과 같이~~ **정정 2026-11-03(같은 날): 기본값 설정 · 테스트까지** — 재시도 기본 3회(지수 200ms×2) · 서킷 기본(창 20 · 실패율 50%) · `kis` 레이트 리미터 2건/초. 인스턴스를 거는 것은 첫 외부 호출(S5) |
| FR-9 | 관측 — Micrometer + OpenTelemetry(추적 ID 를 BFF 에서 이어받음) · JSON 로그. 금액 · 토큰 로그 마스킹은 지금 규칙 그대로 — **2026-11-03: Compose Jaeger 로 내보내기 실측**(BFF → HTTP → 인증 → 아웃박스 발행 → 전송 → 구독 한 추적 span 9). 배포 수집처는 `OPS-001` |
| FR-10 | 실행 — Docker Compose(Postgres · RabbitMQ · platform · bff — ~~**정정 2026-11-03: BFF 는 호스트에서**(:4001 launchd). BFF 이미지는 `OPS-001`~~ **같은 날 닫음: BFF 이미지(`bff/Dockerfile`, REST 만) · :4101 · + Jaeger :16686**). 지금 launchd `com.salt.server` · BFF 상시는 S7 까지 그대로 |
| FR-11 | 테스트 — JUnit 5 · Kotest · Testcontainers(Postgres · RabbitMQ). CI 명령 하나(`./gradlew check`) |
| FR-12 | 하네스 — `salt-server/.claude/rules/` 에 Kotlin 판 규칙(아키텍처 · 테스트 · 성능 · 보안)을 새 파일로. 각 200줄 이하. 루트 `CLAUDE.md` 영역 표에 `salt-platform` 행 |
| FR-13 | 빈 서비스 `ping` 이 인증 → DB 읽기 → 아웃박스 이벤트 발행 → 구독 → 추적 ID 연결을 통과 |

## Acceptance Criteria

- [x] `./gradlew check` 에서 Modulith · ArchUnit 위반 0, 위반 코드 넣으면 실패 — 변이 5회(도메인 Spring import → 컴파일 · application → api 순환 → Gradle · infrastructure 의 `toKrwInteger` → ArchUnit · app → ping 내부 → Modulith · app 안 도메인 패키지 `@Component` → ArchUnit), 사본으로 되돌린 뒤 통과(2026-11-03)
- [x] Compose 로 platform + Postgres + RabbitMQ 기동, `ping` 종단 통과 — Express 방식 서명 토큰 · 같은 추적 ID 로 되울림 400ms 이내(2026-11-03). 실측이 실행 jar 의 `kotlin-reflect` 누락을 찾음(수정)
- [x] 에러 바디가 Express 와 같은 모양 — 골든 4건(401 셋 · 404) 바이트 일치 + 도메인 오류 순서(details 먼저)
- [x] Kotlin 규칙 문서 200줄 이하

## 계약 영향

- `BFF-REQ-045`(라우팅 스위치) · `DB-REQ-036` · `SRV-REQ-044`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-10-30 | **FR-12 일부 먼저** — 사용자 "msa rule · kotlin rule 없고": `salt-server/.claude/rules/msa-services.md`(서비스 경계 · 데이터 · 통신 · 스트랭글러) · `kotlin-platform.md`(스택 · 모듈 · Express 규칙 대응 · 테스트 · 보안 · 성능 대응) 신설, 루트 `CLAUDE.md` 서피스 표에 `salt-platform` 행 · `salt-server/CLAUDE.md` 색인. 코드(FR-1~11 · 13)는 그대로 to-do — 규칙은 착수 기준으로 쓰고 S0 에서 실제 구조와 대조해 고친다 |
| 2026-11-03 | **S0 구현**(`feat/srv-req-043-s0-platform`, 루트 `MONEY-S0-platform-slice.md`) — to-do → in-progress. 확정 조합 Boot 4.1.2 · Kotlin 2.3.21(Boot BOM) · Modulith 2.1.2 · JDK 21(툴체인 자동 받기 · **데몬도 21** — jOOQ 3.21 코드 생성 플러그인 요구) · springdoc 3.2.0 · json-schema-validator 3.0.6(3.0.7+ 는 Jackson 3.2 를 끌어와 Boot 를 덮음). 모듈: `shared-kernel` · `support/{web,persistence,messaging}`(Modulith OPEN) · `services/ping/{domain,application,infrastructure,api}` · `app`(조립 `com.salt.ping.PingComposition` — 패키지로 ping 모듈 안). FR-5 서비스별 풀 · 트랜잭션 매니저(`pingTx`) · Flyway · jOOQ(DDL 스크립트에서 생성, 인덱스 문장은 `[jooq ignore]`). FR-7 HS256 · 시계 오차 0 · 401 문구 셋. FR-9 OTel 브리지 · ECS JSON 로그 · OTLP 내보내기는 주소 있을 때만(`OPS-001`). 테스트 27(커널 9 · 경계 8 · 종단 10). FR-8 Resilience4j 설정은 첫 외부 호출 때 |
| 2026-11-03 | **코드 리뷰(high) 뒤** `405e5683` — 토큰 없는 없는 경로 401 → 404(Express 와 같게, 골든 그대로 통과) · 틀린 메서드 404 · Spring 4xx 가 500 으로 가던 것 · 오류 바디 늘 JSON · 아웃박스 트랜잭션 확인을 "이 서비스 풀"로 · 릴레이 포기(10회 → `dead_at`) · 순서 `seq`. FR-8 · FR-9 · FR-10 같은 날 닫음(위 줄 정정). Postgres 17 로 같은 테스트 통과(jOOQ "older than dialect" 경고는 17 도 같다 — 판과 무관). 테스트 31 |
| 2026-11-03 | **done** — 수용 기준 4/4 · FR-1~13(FR-8 인스턴스 연결은 첫 외부 호출이 있는 `SRV-REQ-049` S5 로 넘김). 커밋 `fafb6a0d`(플랫폼) · `405e5683`(리뷰 4건 · FR-8 · 9 · 10) · `b308718e`(문서) |
| 2026-11-03 | MONEY-S1a — 이 REQ 에 걸린 몫(`e83f7f80`): 서비스가 둘이 되며 `ServiceDatabase` · `OutboxWriter` 빈이 타입마다 둘 — `PingComposition` 에 `@Qualifier`. 테스트 컨테이너가 savings 비밀번호를 받는다 |
