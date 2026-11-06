# DB-REQ-040 — 체크리스트

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 몫: FR-3 `notification_pref(user_id, domain, enabled, updated_at)` — notification Flyway V1 · 도메인 CHECK 셋 · upsert 한 문장
- 수용 기준 2 충족(`NotificationSpec` · 종단 · 실스택 새 사용자)
- 미검증: 없음(이 몫 안)

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`) · `fc0207cb`

- FR-2: `services/identity/infrastructure/.../V1__baseline.sql` — `user_domain_pref`(+ outbox · processed_event · shedlock) · 모양 CHECK 다섯(고른 도메인 · 순서 넷 · 숨김 0~3 · 순서와 숨김 짝 · 끝은 고른 뒤)
- 검증: 종단 테스트 "DB 모양 검사 — 도메인 밖 값은 표가 막는다" · 로컬 운영 DB 적용 뒤 표 다섯 확인 · 임시 사용자 행 생성 → 삭제(0행으로 복귀)
- FR-1 · 4 · 5 · 6 은 S3b · S3c
