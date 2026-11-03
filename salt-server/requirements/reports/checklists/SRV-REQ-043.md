# SRV-REQ-043 — Kotlin 플랫폼 S0 검증 · 2026-11-03

커밋 `fafb6a0d`(플랫폼) · `405e5683`(리뷰 4건 · FR-8 · 9 · 10). 루트 `requirements/reports/checklists/MONEY-S0-platform.md`.

| 항목 | 결과 |
|---|---|
| `./gradlew check`(최종 HEAD) | **31 / 0** — 커널 9 · 경계 8(Modulith `verify()` + ArchUnit 7) · 종단 14(Testcontainers Postgres 14 · RabbitMQ 4) |
| Postgres 17 | `-Psalt.test.postgres=postgres:17-alpine` 같은 31 통과. jOOQ "older than dialect" 경고는 14 · 17 둘 다 — 오픈소스판 방언이 최신 기준이라 판과 무관 |
| 경계 변이 5 | 도메인 Spring import → 컴파일 · application → api 순환 → Gradle · infrastructure `toKrwInteger` → ArchUnit · app → ping 내부 → Modulith · app 안 도메인 패키지 `@Component` → ArchUnit. 사본 복원 뒤 통과 |
| 오류 바디 골든 | Express(:4000) 녹화 4건 바이트 일치 — 토큰 없는 없는 경로도 404(리뷰 뒤) · 도메인 오류 순서 · 틀린 메서드 404 · 406(500 아님, JSON) |
| 인증 | HS256 · 시계 오차 0 · Express `jsonwebtoken` 으로 서명한 실 토큰 수용 · 만료 · 잘못된 토큰 문구 |
| Compose 실측 | platform · Postgres · RabbitMQ · BFF(:4101) · Jaeger — ping 종단 400ms 안 되울림 · 같은 추적 ID · Jaeger 한 추적 span 9(HTTP → 인증 → 아웃박스 발행 → 전송 → 수신) |
| 실행 jar 결함 | `kotlin-reflect` 누락(테스트만 통과) → 관례 플러그인에 추가 · 기동 확인 |
| 로그 | ECS JSON · 줄마다 trace.id · 토큰 0건(Compose 로그 grep) |
| FR-8 | ShedLock(릴레이) · Resilience4j 기본값 테스트(재시도 3 · `kis` 2건/초) |
| 주문 · 계좌 코드 | 0 — 외부 호출 자체가 없다 |
| Express 쪽 | 코드 무변경(문서 · 규칙만) — `npm run build` 등 해당 없음 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| Resilience4j 인스턴스 연결 | 외부 호출이 아직 없다(기본값 · 테스트는 끝) | S5 첫 외부 호출 |
| 배포 이미지 CI · 수집처 · 경보 | 배포 환경이 없다 | `OPS-001` |
| launchd 상시 | 화면 경로가 없다(BFF 표 `/platform` 만) | S1 |
