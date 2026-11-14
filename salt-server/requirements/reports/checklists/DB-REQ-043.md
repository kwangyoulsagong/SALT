## F017 v2 단계 1b — 3종 채움 · 국내 단타 원장 (2026-11-10, `feat/f017-s1b-triad-backfill`)

| 항목 | 상태 | 근거 |
|---|---|---|
| FR-6 출처 라벨 | 충족 | 마이그레이션 적용(`prisma migrate deploy`) · CHECK 6값 · 국내 장기 51,305 → `backtest_full` · 롤백 SQL 머리 · `npm test` 1133/1133 · lint · build · 레이어 훅 사후(음성 대조 exit 2) · 서버 150요청 · 300모드 실측: 3종 결함 160 → 6 · p95 40ms(재시작 직후 292) |
| FR-1~5 · FR-6 등급 표 · 뷰 | 미착수 | 단계 2~4 |

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

| 항목 | 상태 | 근거 |
|---|---|---|
| FR-3 표 · 뷰 · CHECK | 충족 | `20261111120000_forecast_base_rate` — `below_min` 이면 숫자 NULL CHECK · `closed` 면 문턱 NULL CHECK · 문턱 뷰는 시장마다 최신 실행 |
| FR-7 원장 · export 뷰 · 채점 표 | 충족 | `20261111130000_trade_check_ledger` · `20261111140000_trade_check_export_and_outcome` · prisma migrate diff 0 |
| 롤백 | 충족 | 전부 추가만 — 파일 머리에 DROP 순서 |
| 직접 읽기 목록 고정(`DB-REQ-036` FR-3) | 충족 | 예측은 원장을 export 뷰로만 |

## F017 v2 단계 3 해설 늘 (2026-11-11, `feat/f017-s3-explain-always`)

| 항목 | 상태 | 근거 |
|---|---|---|
| FR-1 해설 스냅샷 | 충족 | 마이그레이션 `20261111150000`(추가만 · 롤백 DROP) · 로컬 DB 적용 · UPDATE → `불변이다` 오류(트리거) · `EXPLAIN` 인덱스 스캔 0.005ms · 유일 키 ON CONFLICT |

## 단계 4 등급 — FR-6 (2026-11-11, `feat/f017-s4-grade`)

| 항목 | 결과 | 근거 |
|---|---|---|
| 마이그레이션 목적 하나 · 롤백 | 충족 | `20261111160000_judgment_tier` — 추가만(뷰 둘 · 표 하나), 롤백 SQL 머리 |
| 로컬 DB 적용 | 충족 | `prisma migrate deploy` — pending 0 · export 뷰 칸 13행 대조 |
| CHECK | 충족 | 등급 3값 · 이유 5값 · 참고면 출처 NULL · 검증됨/주의면 출처 있음 · CI 하한 ≤ 상한 |
| 계약 대조 | 충족 | `tests/store/test_schema_contract.py` — 손 선언 `judgment_tier` 와 DB 칸 같음 |
| 읽기 쿼리 | 충족 | 서버는 `v_judgment_tier` 한 문장(칸 4행 — 표 행 = 실행 수 × 4, 하루 4행). `EXPLAIN (ANALYZE, BUFFERS)` 는 확인 2회차에 돌림(아래) |
| 사용자 열 | 0 | export 뷰 · 등급 표 모두 |
| 정정 | 기록 | 계획의 '행동' 열 없음 — spread 는 칸의 성질 |

### 확인 2회차 (2026-11-11, 사용자 "이번 태스크 다한겨?" — 아니었다)

| 항목 | 결과 | 근거 |
|---|---|---|
| `EXPLAIN (ANALYZE, BUFFERS)` 서버 읽기 | 충족 | `v_judgment_tier` — `judgment_tier_pkey` Index Scan → Sort → Unique · 4행 · 0.45ms |
| `EXPLAIN` 배치 읽기 | 충족 | `v_judgment_outcome_export` — 원장 Seq Scan 163,157행 · 67ms. 매일 한 번 전부 읽는다(필터가 거의 안 거름) — 인덱스 불필요 |
| 정정 | 기록 | 1회차 체크리스트 · Changelog 에 `EXPLAIN` 을 돌리지 않고 '한 문장'이라고만 적었다 — 실측으로 바꿈 |

## F017 v2 단계 5 시나리오(`feat/f017-s5-short-direction`) (2026-11-11)

| 항목 | 결과 | 근거 |
|---|---|---|
| 마이그레이션 | 충족 | 목적 1(단타 확률) · 추가만 · 롤백 SQL 실제 실행 2회 · `prisma migrate deploy` |
| CHECK | 충족 | 분위 순서 · 0≤p≤1 · 통과면 사유 없음 / 못 넘으면 사유 있음 · 만료 > 기준 |
| 계약 대조 | 충족 | `test_schema_contract`(실 DB) · 저장 테스트 2(재실행 행 수 · 최신만 · 끝 봉 없으면 다음 실행 · 한 줄 한 번 · 만료 renderable false) |
| EXPLAIN | 충족 | 칸 뷰 2.5ms · 종목 뷰 0.3ms 인덱스 스캔 |
| `DB-REQ-036` 주인 표 | 충족 | Changelog 행 — 주인 forecast · 서버 뷰 SELECT 만 · public 직접 읽기 추가 0 |

## 단계 6 — FR-4 (2026-11-12)

| 항목 | 구현 | 확인 |
|---|---|---|
| 사전 · 서술 · 선반영 표 + 뷰 | `20261112100000_news_reaction` — `news_kind_dict` · `news_reaction_stat` · `news_pre_move` · 뷰 셋 | `prisma migrate deploy` · 예측 스키마 계약 테스트(실 DB) |
| 원천 읽기는 export 뷰 | `public.v_kr_news_title_export` · `v_news_article_export` | 예측 store 가 이 둘만 읽음(grep) |
| 서버 읽기 경로 | 선반영은 PK (market, symbol, bar_at) 역순 한 행 · 사전 · 서술은 한 번 읽고 10분 캐시 | 실 응답 |

### 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 첫 "ok" 서술(숫자 있는 칩) 실화면 | 국내 제목 이력이 11-06 ~ 뿐이라 첫 실행은 전부 `below_min` — 서버 1년 백필이 장 밖 30쪽/분으로 채우는 중 | 백필이 1년 앞에 닿은 뒤 매일 배치(`daily.sh` news_reaction) 다음 회차 — 2026-11-13 |
| ~~응답 시간(p95) 실측~~ | **닫힘 2026-11-12 11:2x**(부하 평균 13 로 내려간 뒤) — 20회씩 p50 / p95: 국내 소식 14 / 207ms · 12 / 24ms · 코인 뉴스 5 / 10ms · 국내 왜 움직였나 19 / 51ms · 코인 9 / 21ms. 선반영 조회 `EXPLAIN` 인덱스 1.5ms · 서술 뷰 2ms | — |

## F016 단계 D 짝(2026-11-12) — 이 REQ 가 머리 주인인 파일

루트 `requirements/specs/done/F016-D-move-summary-slice.md` · 체크리스트 `requirements/reports/checklists/F016-D-move-summary.md`

| 바뀐 것 | 확인 |
|---|---|
| coach `application/api/index.ts`(머리 주인) 조립에 유스케이스 둘(`getMoveSummary` · `generateMoveSummaries`) · 의존 없으면 꺼짐(테스트 조립) | 서버 테스트 1282 · 빌드 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 없음 | — | — |

## 2026-11-12 — 서버 S3b(`MONEY-S3b-identity-accounts`)

루트 `requirements/specs/in-progress/MONEY-S3b-identity-accounts-slice.md` · 체크리스트 `requirements/reports/checklists/MONEY-S3b-identity-accounts.md`

| 바뀐 것 | 확인 |
|---|---|
| 짝 — coach 의존 `coachedUsers` · `listCoachedUsers` | build · test · 레이어 훅 사후 실행 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 없음 | — | — |

## F017 v4 순서 1a 짝 (2026-11-13) — 이 REQ 가 머리 주인인 파일

루트 `requirements/specs/in-progress/F017-v4-stage1-panel-slice.md` · 체크리스트 `requirements/reports/checklists/F017-v4-stage1-panel.md`

| 바뀐 것 | 확인 |
|---|---|
| `coach/application/api` 조립에서 `GetSymbolScenario` 가 기저율 리더를 같이 받는다 — 표 · 뷰 변경 0(읽는 뷰 `v_base_rate` · `v_base_rate_trigger` 그대로) | 서버 build · lint · test 1325 · layer-check / BFF build · test 481 / FE check-types 13/13 · lint 13/13 · test(core 298 · ui 63) · 레이어 훅 사후(대조군 둘 exit 2 → 23파일 0) · 실스택(BFF 4001 — 비소유자 · 소유자 시험 토큰, BTC · 005930) · 실화면 1440 · 390 앱 UA |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 없음 | — | — |

## F017 v4 1d 짝 (2026-11-13, `feat/f017-v4-s1d-coach-panel`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 조립 지점만 — 스키마 · 표 0 · build 0 | 충족 | 주인 REQ 체크리스트 |

## 2026-11-14 — F017 v4 2c 사실 추출(`feat/f017-v4-s2-disclosure-body`)

| 항목 | 결과 | 근거 |
|---|---|---|
| FR-9 extracted_fact | 충족(기사 본문) | 실측 본문 38 → 사실 200 · 검사 버림 21 · LLM 실패 0 · 본문 하나 약 8초(로컬 CLI) · 표본 25 눈 대조(숫자 · 단위 원문 그대로 · 명사구) |
| 숫자 원문 대조 | 충족 | 경계 표 18(환산 · 반올림 · 음수 · 단위 · 문장 · 길이) · 변이 16/16 |
| 포털 행 0 | 충족 | 실DB — 포털 행 · RSS 행을 넣고 `aiBodiesForExtraction` → RSS 행만 · SQL + `isAiReadable` 두 겹 |
| 상한 순서 | 충족 | 해설 210 · 한 줄 240 · 추출 300 경계 시험 셋(배치마다) |
| 검증 | 충족 | `npm test` 1549/1549 · lint · build · `test:layer-check` · 훅 사후 28파일(음성 대조 exit 2) |

| 미충족 · 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| 공시 원천 추출 | OpenDART 키 없음 | 2b 뒤 — 같은 표(`source_kind = 'disclosure'`) |
| 코인 종목 태그 잡음(ETF · CEO · SEC 가 종목 칸에) | 원장 태깅이 그렇다 — 회사 사정은 실제 종목으로만 읽어 화면엔 안 나옴 | 2d 에서 읽는 쪽이 거름 |

## 2026-11-14 — 2d

- FR-11 `company_brief` 표 만들지 않음 — 읽을 때 조립(p95 277ms · 쿼리 0.27ms)
