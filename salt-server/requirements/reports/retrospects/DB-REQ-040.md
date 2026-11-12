# DB-REQ-040 — 회고

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 문서의 주인(identity)과 읽는 쪽(notification)이 달랐다 — 착수 전 네 질문 ③에서 잡았다. 루트 회고 `MONEY-S2c-notification`

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- 목록 열을 배열 대신 쉼표 키로 — jOOQ 생성기(H2 흉내)가 `text[]` 를 못 읽을 위험을 피하고, 집합 규칙은 도메인이 지킨다. 모양은 CHECK 로 이중
- Action: S3b 이동 때 이 표는 그대로(이미 identity 스키마)

## 2026-11-12 — 서버 S3b(`MONEY-S3b-identity-accounts`)

- FR-1 이동 · FR-5 서명 키 — Flyway V2 · 가져오기 대조 5 · 6 · 6. 회고 본문은 루트 `requirements/reports/retrospects/MONEY-S3b-identity-accounts.md` — 플랫폼 단독 종단이 BFF 의 `Bearer undefined` 를 몰랐다 · 반쯤 옮긴 상태의 FK 틈
- Action: 경로를 옮기면 BFF 를 거친 실스택을 첫 확인으로
