# DB-REQ-046 체크리스트 — push_subscription · pushed_at

| FR | 결과 | 근거 |
|---|---|---|
| FR-1 표 · 인덱스 · 등급 | 충족 | Flyway v3 — 테스트컨테이너 · 로컬 운영 DB 적용(`Migrating schema "notification" to version "3 - push subscription"`) · `MyDataEndToEndTest` 등급 검사 통과 |
| FR-2 `pushed_at` · 옛 행 표시 | 충족 | 마이그레이션 `UPDATE … SET pushed_at = created_at` · 회차가 옛 알림을 보내지 않음(로컬 기동 뒤 첫 회차 로그 0건) |
| FR-3 되돌리기 | 문서만 | 파일 머리 두 문장 — 실행해 보지 않았다 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 되돌리기 실행 | 로컬 운영 DB 에 지금 쓰는 표라 내리지 않았다 | 되돌릴 일이 생길 때 |
