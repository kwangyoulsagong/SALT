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

## 2026-11-09 — 기사 본문(주인 `SRV-REQ-054` · `BFF-REQ-053` · `FE-REQ-068`)

- `PrismaKrMoveSourceStore.newsTitle(serial, code)` — 연결 PK(serial, code) → 제목 PK, 광고성 제외(본문 찾기 입력) — 검증은 주인 체크리스트(서버 1031 · BFF 430 · 실화면 1440 · 훅 사후 실행)

## 2026-11-10 — 검색 모달 2단계(주인 `FE-REQ-066` FR-8 · `SRV-REQ-055` · `BFF-REQ-054`)

- 새 읽기 둘의 `EXPLAIN` 은 `SRV-REQ-055` 체크리스트. 제목 39행 정리 — 원본 로컬 백업 · 정리 뒤 제어 문자 0행
- 루트 체크리스트 `requirements/reports/checklists/FE-066-067-search-header.md`

## 2026-11-12 — F017 단계 6 덧붙임

- [x] FR-1 시황 · 공시 제목 보관 30 → 400일 — 측정 태그의 1년 표본(`SRV-REQ-053` FR-6). 하루 약 1,400행(관련 종목 있는 것만) → 약 56만 행. 정리는 같은 워커가 나눠 지운다
- [x] 회귀: 영역 테스트 전체 통과(서버 1236 · BFF 453 · FE check-types · lint) — 기존 동작 바뀐 것 없음(태그는 덧붙임)
- 주인 REQ 의 체크리스트 · 미검증 표는 `SRV-REQ-053` · `FE-REQ-064` · `BFF-REQ-052` · `FC-REQ-028` · `DB-REQ-043`

## 단계 D(2026-11-12) — FR-8 · 9

루트 `requirements/specs/done/F016-D-move-summary-slice.md` · 체크리스트 `requirements/reports/checklists/F016-D-move-summary.md`

| 요구 | 확인 |
|---|---|
| 목적 하나 · 롤백 SQL | `20261112120000_move_explanation` 머리 롤백 · 추가만(표 · 뷰) |
| UPDATE 실패 | 로컬 DB 실측 `UPDATE` → `public.move_explanation 는 불변이다` |
| 게이트 CHECK | `ok` 인데 문장 NULL · 인용 0 넣기 → `move_explanation_check` 위반(트랜잭션 되돌림) |
| 새 쿼리 EXPLAIN | 그날 시도 `move_explanation_day_idx` 인덱스 스캔 0.15ms |
| 본문 · 원문 열 0 | 열 목록 — 문장(검사 통과본) · 인용 id · 사유 코드뿐 |
| 교차 스키마 0 | coach 는 market 공개 API 로 카드를 읽는다 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 보존 정리 | 종목 · 하루 최대 4행(카드 날만) — 한 해 수천 행. 정리 작업 없이 둔다 | 행 수가 10만을 넘으면(주간 리포트 시도 수로 본다) |

## F017 v4 순서 1b 짝 (2026-11-13) — 이 REQ 가 머리 주인인 파일

루트 `requirements/specs/in-progress/F017-v4-stage1-panel-slice.md` · 체크리스트 `requirements/reports/checklists/F017-v4-stage1-panel.md`

| 바뀐 것 | 확인 |
|---|---|
| `kr_flow_intraday` 보관 7 → 35일(`KR_FLOW_INTRADAY_RETENTION_DAYS`) — 스키마 변경 0 · 정리 배치가 다음 회차부터 덜 지운다(유니버스 50 × 하루 약 40행 × 35일 ≈ 7만 행) | 서버 build · lint · test 1379 · layer-check / BFF build · test 486 / FE check-types · lint 13/13 · test 361 / 훅 사후(대조군 둘 exit 2 → 18파일 0) / 변이 28/28 / 전 종목 157 실측(실패 0 · 원인 칸 null 0 · 금지어 0 · 서버 p95 25ms · BFF p95 34ms) / 실화면 국내 둘 · 코인 둘 × 1440 · 390(axe 0 · 넘침 0) · 옛 응답 · 미리보기(`route`) |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 없음 | — | — |

## 2026-11-14 — F017 v4 2a 걸침(`SRV-REQ-058`)

- `PrismaKrMoveSourceStore.newsTitlesForAiBody` — `kr_news_title` 읽기 하나 더함(AI 경로 본문 입력, `SRV-REQ-058` 2a) · 표 · 쓰기 무변경
- 검증은 `SRV-REQ-058` 체크리스트 — 이 REQ 의 기존 항목은 다시 열지 않음
