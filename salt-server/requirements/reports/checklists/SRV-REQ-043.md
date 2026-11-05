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

## done 2026-11-03

- 수용 기준 4/4 · FR-1~13. FR-8 인스턴스 연결은 `SRV-REQ-049`(S5) 로 넘김(그 스펙 이력에 기록). 최종 HEAD 재검증 아래 루트 체크리스트 §2

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 이 REQ 에 걸린 몫(`e83f7f80`): 서비스가 둘이 되며 `ServiceDatabase` · `OutboxWriter` 빈이 타입마다 둘 — `PingComposition` 에 `@Qualifier`. 테스트 컨테이너가 savings 비밀번호를 받는다
- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- [x] `./gradlew check` 통과(가계부 종단 11 · 도메인 19 포함, 총 109+) · Modulith · ArchUnit 위반 0
- [x] `bootJar` → 로컬 운영 DB Flyway household V1 · health UP

## 2026-11-04 — 가계부 S1b `ServiceLock`

- [x] `ServiceLock.executor`(JDBC 공급자는 messaging 모듈 안) · 반복 워커가 household `shedlock` 표로 잠금 · `./gradlew check`(Modulith · ArchUnit) 통과

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`)

- 몫: 조립 `ContentComposition`(네 층 · 트랜잭션 매니저 `contentTx`) · 공개 경로 `salt.auth.public-paths` 에 `/api/content/tips` · `/api/content/tips/*` · `/api/content/policy-params/*`(개인은 `/api/content/me/…`). `PlatformEndToEndTest` 권한 표본 이동. 실행 jar 로컬 운영 기동 확인
- 검증: 슬라이스 검증 그대로(`requirements/reports/checklists/MONEY-S2a-tips-content.md`) — 이 REQ 의 수용 기준은 바뀌지 않았다
- 미검증: 없음(이 몫 안)
