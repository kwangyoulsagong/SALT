# DB-REQ-041 — 체크리스트

루트 슬라이스 `requirements/specs/done/F016-A-market-status-tags-slice.md` · 체크리스트 `requirements/reports/checklists/F016-A-market-status-tags.md`

## 단계 A(2026-11-06) — FR-2 · 3 · 6

| 요구 | 마이그레이션 | 확인 |
|---|---|---|
| 목적 하나씩 · 롤백 SQL | 셋 — 열 추가 / VI 표 / 시장 조치 표, 머리에 롤백 | 로컬 `prisma migrate deploy` 셋 적용 · `prisma generate` · 서버 빌드 |
| 본문 열 0 | 새 표 둘에 본문 · 링크 열 없음 | 스키마 확인 |
| 새 쿼리 EXPLAIN | `latestViEvents` · `marketActions` | 순차 스캔(76행 · 1행) 0.17 · 0.12ms. 순차 스캔 끄면 PK 비트맵 인덱스 스캔 — 커지면 PK |
| 경합은 ON CONFLICT | upsert 둘 — 같은 회차 중복은 먼저 하나로 | 오류 코드 catch 0(lint) |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `kr_vi_event` 보존 정리 | 하루 시장 전체 수백 행 — 단계 A 에선 쌓기만 | 단계 B 정리 워커(FR-1 나눠 지우기와 같이) |
| `move_explanation` UPDATE 실패 테스트 | FR-8 — 단계 D | 단계 D |
| FR-1 · 4 · 5 · 7 · 8 | 단계 B~D | 전 영역 계획 |
