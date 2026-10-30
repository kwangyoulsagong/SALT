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
| FR-3 | `shared-kernel` — `Money`(value class + 통화, `BigDecimal`) · `ErrorKind`(현재 7값과 같은 HTTP 매핑) · `Clock` 포트 |
| FR-4 | 경계 검증 — Spring Modulith `verify()` + ArchUnit(도메인 → 인프라 금지 · 서비스 간 `internal` 패키지 접근 금지). 빌드 실패로 막는다(지금 `layer-check.mjs` 대응) |
| FR-5 | 영속 — jOOQ 코드 생성(서비스 스키마별) · Flyway 서비스별 위치(`DB-REQ-036`) |
| FR-6 | API — Spring MVC + springdoc-openapi. 응답 포맷 · 에러 바디는 지금 Express 와 같은 모양(BFF 무변경이 합격 기준) |
| FR-7 | 인증 — 리소스 서버(JWT 검증). S3 전까지는 지금 공용 비밀키(HS) 검증, S3 에서 JWKS 로(`SRV-REQ-048`) |
| FR-8 | 스케줄 — `@Scheduled` + ShedLock(DB 락). 외부 호출 — Resilience4j(재시도 · 서킷 · 레이트 리미터) |
| FR-9 | 관측 — Micrometer + OpenTelemetry(추적 ID 를 BFF 에서 이어받음) · JSON 로그. 금액 · 토큰 로그 마스킹은 지금 규칙 그대로 |
| FR-10 | 실행 — Docker Compose(Postgres · RabbitMQ · platform · bff). 지금 launchd `com.salt.server` 는 S7 까지 그대로 |
| FR-11 | 테스트 — JUnit 5 · Kotest · Testcontainers(Postgres · RabbitMQ). CI 명령 하나(`./gradlew check`) |
| FR-12 | 하네스 — `salt-server/.claude/rules/` 에 Kotlin 판 규칙(아키텍처 · 테스트 · 성능 · 보안)을 새 파일로. 각 200줄 이하. 루트 `CLAUDE.md` 영역 표에 `salt-platform` 행 |
| FR-13 | 빈 서비스 `ping` 이 인증 → DB 읽기 → 아웃박스 이벤트 발행 → 구독 → 추적 ID 연결을 통과 |

## Acceptance Criteria

- [ ] `./gradlew check` 에서 Modulith · ArchUnit 위반 0, 위반 코드 넣으면 실패(변이 1회)
- [ ] Compose 로 platform + Postgres + RabbitMQ 기동, `ping` 종단 통과
- [ ] 에러 바디가 Express 와 같은 모양(골든 1건)
- [ ] Kotlin 규칙 문서 200줄 이하

## 계약 영향

- `BFF-REQ-045`(라우팅 스위치) · `DB-REQ-036` · `SRV-REQ-044`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-10-30 | **FR-12 일부 먼저** — 사용자 "msa rule · kotlin rule 없고": `salt-server/.claude/rules/msa-services.md`(서비스 경계 · 데이터 · 통신 · 스트랭글러) · `kotlin-platform.md`(스택 · 모듈 · Express 규칙 대응 · 테스트 · 보안 · 성능 대응) 신설, 루트 `CLAUDE.md` 서피스 표에 `salt-platform` 행 · `salt-server/CLAUDE.md` 색인. 코드(FR-1~11 · 13)는 그대로 to-do — 규칙은 착수 기준으로 쓰고 S0 에서 실제 구조와 대조해 고친다 |
