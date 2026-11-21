# F011 날마다 다른 국내 장 시간 체크리스트 (2026-11-21)

색인이다 — 세부는 영역 체크리스트에 있다.

| 항목 | 결과 | 근거 |
|---|---|---|
| `SRV-REQ-040` | 장 상태 · 시세 창 · 보정 · 묶기 · 실시간이 그날 장 시간으로. 경계 표 시험 · 서버 test 2,048 · build · lint · layer-check | `salt-server/requirements/reports/checklists/SRV-REQ-040.md` §2026-11-21 |
| `DB-REQ-033`(파일만) | 반환 모양 · 정리 쿼리 `EXPLAIN` 인덱스 범위 스캔 | `salt-server/requirements/reports/checklists/DB-REQ-033.md` §2026-11-21 |
| 공통 수용 기준(§6) | 주문 경로 0 · 금액 계산 0 · 화면 문구 변경 없음 | — |
| 계약 | DDL · API · BFF · 프론트 무변경 | — |

| 미충족 | 사유 | 언제 닫히나 |
|---|---|---|
| 2026-11-19 실데이터 복구 확인 | 재기동 전 | 머지 · 재기동 뒤 첫 큰 백필 회차 |
| 예측 쪽 고정 장 시간 | 영역 밖 | 예측 REQ — 2027 수능일 전 |

## 2단계 — 예측 (2026-11-21)

| 항목 | 결과 | 근거 |
|---|---|---|
| `FC-REQ-009` | 일봉 공개 시각 날별 · 5분봉 그날 정규장 · 장 밖 봉 정리 · 누수 시험(수능일 16:30 / 17:00). ruff · pyright 0 · lint-imports 3/3 · pytest 780(DB 포함) · leakage 53 · dry-run 둘 | `salt-forecast/requirements/reports/checklists/FC-REQ-009.md` §2026-11-21 |
| 걸친 REQ | `FC-REQ-005` · `020` · `021` · `022` · `027` · `028` · `SRV-REQ-040`(파일만) | 각 영역 |
| 계약 | DDL · 뷰 · 서버 · BFF · 프론트 무변경 | — |

| 미충족 | 사유 | 언제 닫히나 |
|---|---|---|
| 예측 표 실데이터 고침 | 실행 트리에서만 쓴다(`OPS-005`) | 머지 · 동기화 뒤 매시 일봉 + 실행 트리 `ingest_kr_minutes --days 4` 한 번 |
