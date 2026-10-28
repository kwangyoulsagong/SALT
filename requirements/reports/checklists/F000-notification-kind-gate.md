# F000 슬라이스 — 알림 1종 · 코드만 · 금액 없음 — 체크리스트

슬라이스: `requirements/specs/in-progress/F000-notification-kind-gate-slice.md` · 2026-10-28
브랜치: `feat/f000-notification-kind-gate` (base `main` `b40f257`)
영역 체크리스트: `salt-server/requirements/reports/checklists/SRV-REQ-008.md` · `SRV-REQ-009.md` · `SRV-REQ-007.md` · `SRV-REQ-006.md` ·
`SRV-REQ-028.md` · `SRV-REQ-029.md` · `DB-REQ-022.md` · `bff/requirements/reports/checklists/BFF-REQ-007.md` · `BFF-REQ-008.md`

## 1. 커밋

| 커밋 | 영역 | 되돌리면 |
|---|---|---|
| `3320883` feat(server) | `notification` 컨텍스트 · 마이그레이션 · 코치 어댑터 | 알림 항목이 문장 모양으로 돌아간다 — **BFF 커밋이 남아 있으면 `alerts` 가 빈 배열**(항목에 `kind`/`messageCode` 가 없어 전부 버린다). 둘을 같이 되돌린다. 스키마는 migration 머리 SQL 로 |
| `ed1615f` feat(bff) | `alerts.viewmodel` | `/api/app/alerts` 가 서버 envelope 를 그대로 넘긴다 |

## 2. 요약

| 확인 | 결과 |
|---|---|
| 단위 | 서버 알림 9(종류 4 거부 · 문장 코드 4 거부 · 금액 5 거부 · 읽기 1종 · 페이지) · BFF 뷰모델 4 |
| 실 DB 발행 | 코치 어댑터 → 공개 API → 행 `signal_update` · `coach.decision_changed` · `title`/`message` NULL · 24시간 만료 · 중복 억제 false → true · `decision_change` 발행 422 코드 |
| 서버 실경로(상시 4000, 재시작) | 목록 1종만(옛 행 숨김) · 숫자 인자 빠짐 · 안 읽은 수 1 · 모두 읽음이 옛 행 안 건드림 · 단건 읽음도 · `size=500` 400 · 무인증 401 |
| BFF 실경로(4001) | `{ alerts: 2건 최신순, unreadCount: 2 }` · 서버가 실은 `avgPrice` 문자열 제거 · `/api/app/home` 200 |
| 시험 행 | `qa-*` 전부 삭제 — 알림 0행(시작과 같음) |
| 게이트 | 서버 `build` · `lint` · `test` 829 · `test:layer-check` · `prisma generate` · Swagger `failOnErrors` · Bash 로 쓴 18파일 레이어 훅 사후 실행 exit 0 · BFF `tsc` · `test` 282 |

## 3. 짝 · 참조 REQ — 변경 없음

| REQ | 왜 안 바뀌나 |
|---|---|
| `FE-REQ-030` · `FE-REQ-011` FR-44 | `/api/app/alerts` 소비처 0건(웹 · 모바일 grep). 문장 매핑은 첫 화면이 생길 때 |
| `BFF-REQ-007` B절 · `app-home` | 안 읽은 수 경로 · 모양 같음(`unreadCount`) — 실경로 200 |
| `SRV-REQ-008` FR-23 | 센티먼트 · 고래 조회 경로 무변경 |
| `notification-cleanup.worker` | `expiresAt` 삭제 그대로 — 새 행도 24시간 만료 |

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 코치 워커가 실제 판단 변화로 알림을 만드는 회차 | 판단이 바뀌어야 생긴다 — 같은 어댑터 · API 를 실 DB 로 확인 | 다음 판단 변화 회차(알림 행 `messageCode` 확인) |
| 알림 화면 · i18n 문장 | 프론트 소비처 없음 | F006 `FE-REQ-030` |
| 모노레포(`salt-microFe`) 게이트 | 프론트 파일 변경 0 | 해당 없음 |
