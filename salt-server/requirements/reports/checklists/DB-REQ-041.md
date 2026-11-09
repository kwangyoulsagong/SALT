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
| `kr_vi_event` 보존 정리 | 하루 시장 전체 수백 행 — 단계 A 에선 쌓기만 | ~~단계 B 정리 워커(FR-1 나눠 지우기와 같이)~~ 닫음 2026-11-06 — 30일 · 5,000행씩(단계 B) |
| `move_explanation` UPDATE 실패 테스트 | FR-8 — 단계 D | 단계 D |
| FR-1 · 4 · 5 · 7 · 8 | 단계 B~D | 전 영역 계획 |

## 단계 B(2026-11-06) — FR-1 · 4 · 5(프로그램 열) · 보존

루트 슬라이스 `requirements/specs/done/F016-B-kr-news-flows-slice.md` · 체크리스트 `requirements/reports/checklists/F016-B-kr-news-flows.md`

| 요구 | 확인 |
|---|---|
| 마이그레이션 목적 하나씩 · 롤백 SQL | 셋(제목 · 업종 · 장중 수급) · 각 머리 롤백 · 추가만 |
| 본문 열 0 | `kr_news_title` 열 grep — body · url · link 0 |
| 새 쿼리 EXPLAIN | 오늘 소식 `kr_news_title_symbol_code_published_at_idx` → PK 0.14ms · 장중 수급 PK 역방향 0.03ms |
| 로컬 적용 · 스키마 대조 | `prisma migrate deploy` · `migrate diff` 남은 차이는 기존 인덱스 이름 둘(이번 밖) |
| 보존 | 제목 30일 · 장중 수급 7일 · VI 30일 — 5,000행씩(테스트: 기한 계산) |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 정리 워커 실제 삭제 | 지울 행이 아직 없다(오늘 생긴 표) | 2026-12-06(첫 30일) — 로그 `국내 등락 원천 정리` |
| 외국인 · 기관 장중 열 | 원천 거부 | 실전 키 전환 시 |
| FR-7 · 8 | 단계 C · D | 전 영역 계획 |

## 단계 C(2026-11-09)

| 항목 | 결과 |
|---|---|
| 마이그레이션 셋 로컬 적용 | `prisma migrate deploy` 통과 · `prisma generate` |
| 추가만(표 다시 쓰기 0) | `move_beta` 새 표 · `sector_mid_code` NULL 허용 · `kr_index_name` 새 표 |
| 예측 계약 대조 | `test_schema_contract.py` 통과(실 DB) |
| 행 | `move_beta` 2,920(11-09 as_of) · `kr_sector_index_daily` 19코드 × 248 · `kr_index_name` 19 · 마스터 중분류 1,712 |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| `move_beta` 보존 | 하루 2,920행 — 1년 약 100만 행. 정리 작업 없음 | 예측 `ops_monitor` 정리에 넣을 때(FC-REQ-027 다음 단계) |
