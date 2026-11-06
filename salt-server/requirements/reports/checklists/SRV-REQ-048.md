# SRV-REQ-048 — 체크리스트

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 몫: FR-5 — `services/notification`(도메인 · 유스케이스 · jOOQ · 리스너 셋 · 정리 워커) · `NotificationController`(`/api/notifications` · `/prefs`) · Flyway notification V1 · coach V1(아웃박스만) · 가져오기 SQL · Express `notification` 삭제
- 검증: `./gradlew check`(`NotificationSpec` 5 · `NotificationEndToEndTest` 4) · Express build · lint · test 929 · 실스택 · 실화면 — 루트 체크리스트
- 수용 기준 4 충족 · 1~3 은 S3
- 미검증: 웹 알림 목록(화면 없음 — F006) · 앱 푸시 — 루트 표

## 2026-11-06 — 서버 S2c 확인 2회차

- 확인 2회차(`55b4290a`): 국내 종목 코드 관문 · enabled 타입 · Express 쓰기 실패 격리 — 결함 셋 고침, 입력 경계 · Swagger 6 · 데드레터 0. 상세 루트 체크리스트

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`) · `fc0207cb` · `7f2ba1ed`

- 몫: FR-1 · FR-2 — `services/identity`(도메인 `ShellPrefs` · 유스케이스 넷 · jOOQ `JooqShellPrefs` · `ShellController`) · Flyway identity V1(`user_domain_pref` + 공통 세 표 · 모양 CHECK 다섯) · `IdentityComposition` · `svc_identity` 로그인
- 은퇴: Express `onboarding` 조합 컨텍스트(5파일) · `/api/onboarding/status` · `PLATFORM_API_URL` · 저축 `/savings/goals/exists`(유스케이스 · 포트 · 저장소 · 테스트) — 삭제 251줄
- 검증: `./gradlew check` 통과(`ShellPrefsSpec` 6 · `IdentityShellEndToEndTest` 6 — 투자 미선택 · 거절 400 · 409 · DB 모양 검사 · `svc_identity` 남의 스키마 권한 오류) · Express build · lint · test 925 · `test:layer-check` · 실스택 · 실화면(루트 체크리스트)
- 수용 기준 1 충족 · 4 는 S2c · 2 · 3 은 S3c · S3b
