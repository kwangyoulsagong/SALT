# SRV-REQ-048 — 체크리스트

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 몫: FR-5 — `services/notification`(도메인 · 유스케이스 · jOOQ · 리스너 셋 · 정리 워커) · `NotificationController`(`/api/notifications` · `/prefs`) · Flyway notification V1 · coach V1(아웃박스만) · 가져오기 SQL · Express `notification` 삭제
- 검증: `./gradlew check`(`NotificationSpec` 5 · `NotificationEndToEndTest` 4) · Express build · lint · test 929 · 실스택 · 실화면 — 루트 체크리스트
- 수용 기준 4 충족 · 1~3 은 S3
- 미검증: 웹 알림 목록(화면 없음 — F006) · 앱 푸시 — 루트 표

## 2026-11-06 — 서버 S2c 확인 2회차

- 확인 2회차(`55b4290a`): 국내 종목 코드 관문 · enabled 타입 · Express 쓰기 실패 격리 — 결함 셋 고침, 입력 경계 · Swagger 6 · 데드레터 0. 상세 루트 체크리스트
