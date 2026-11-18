---
id: DB-REQ-043
feature: F017
area: db
kind: MIGRATION
title: "AI 코치 — 해설 스냅샷 · 단타 확률 · 기저율 · 사건 종류 표와 계약 뷰"
priority: high
created: 2026-11-10
status: in-progress (2026-11-10 FR-6 출처 라벨 · 2026-11-11 FR-3 기저율 · FR-7 점검 원장 · FR-1 해설 스냅샷 · FR-6 등급 · FR-2 단타 확률(단계 5) · 2026-11-12 FR-4 소식 태그(단계 6) — 나머지 to-do)
source: pm/requirements/specs/in-progress/FEATURE-017-ai-coach-best-case.md
---

## Summary

`FEATURE-017` 의 저장 몫. 해설 스냅샷은 coach(Express Prisma — S6 이전 때 Flyway 로), 나머지는 forecast 스키마(서버 S5 전까지 DDL 은 `salt-server/prisma` 에서만 — 루트 `CLAUDE.md` · `ADR-007`).
요청 경로가 **저장값만 읽게** 하는 표들이다(`SRV-REQ-053` 불변식 1).

## FR

| FR | 내용 |
|---|---|
| FR-1 | **coach `explanation_snapshot`** — `(symbol, mode, fingerprint)` 유일 · `tier` · `sentences jsonb`(문장 · 인용 id — 쿼리 조건 아님) · `provider` · `verifier jsonb`(문장 수 · 탈락 · 대체 · 원문 0) · `generated_at`. 읽기 인덱스 `(symbol, mode, generated_at desc)`. 불변(UPDATE 0 — 새 지문 = 새 행) · 보존 종목 · 모드당 최근 N — **done 2026-11-11** 마이그레이션 `20261111150000_explanation_snapshot`(추가만 · 롤백 = DROP TABLE · 주인 coach · 사용자 열 0). 정정: 칸 `tier` 대신 `source`(`llm` · `llm_checked` — 저장은 AI 단만, 템플릿 · 없음은 읽기 때 사실표로) · `action`(이전 단은 같은 방향일 때만) · `facts_hash`. UPDATE 차단 = 기존 `judgment_ledger_immutable()` 트리거 · 보존 최근 5 · `EXPLAIN` 읽기 = `explanation_snapshot_latest_idx` 인덱스 스캔 |
| FR-2 | **forecast `short_horizon_prediction`** — `(symbol, horizon, as_of, model_version)` PK · `p_up` · `q10` · `q50` · `q90` · `invalidation` · `available_at` · CHECK(분위 순서 · 0≤p≤1). 뷰 `v_short_horizon_card`(최신 · 시험 통과 표지 · 성적 · 빗나간 사례 · 지난 예측은 `renderable=false`) — **done 2026-11-11**(단계 5 `d0e79ff6`) 마이그레이션 `20261111170000_short_horizon`(추가만 · 롤백 SQL 머리). **정정**: 표 셋 — 시험 `short_horizon_test`(실행마다 칸마다 · 안 한 칸도 `not_tested` · 성적 출처 `track_origin` backtest\|live 하나 · 라이브 적합 `live_params` jsonb) · 예측 `short_horizon_prediction`(+ `ref_price` · `expires_at` · CHECK 분위 순서 · 0≤p≤1) · 결과 `short_horizon_outcome`(예측 한 줄 = 한 줄). 뷰 둘 — 칸 `v_short_horizon_cell` · 종목 `v_short_horizon_card`(renderable = 칸 통과 · 같은 모델 · 만료 전). `EXPLAIN (ANALYZE)` 칸 2.5ms(시험 표 순차 — 하루 6행) · 종목 0.3ms(`short_horizon_prediction_latest_idx` 인덱스 스캔) |
| FR-3 | **forecast `base_rate_stat`** — ~~`(condition_id, symbol, horizon, as_of)`~~ **`(prereg_key, market, condition_id, horizon, as_of)` — 시장 풀링(2026-11-11: 종목 하나의 조건 표본은 유효 n 100 · 날 60 을 거의 못 넘는다)** · 표본 · 유효 n · 날 · 오른 비율 · 수축 · Wilson · 평균 · 분위 · 보유 연장 분위 · Holm 표지 · 최근 다름. 조건 정의는 `preregistration`. 뷰 `v_base_rate` + **라이브 문턱 `base_rate_trigger` · 뷰 `v_base_rate_trigger`**(종목 · 조건 · `next`/`closed` · 기준 종가 · 기준 봉 시각 · 가격/시가/거래대금 문턱 — 시장마다 최신 실행만) — **done 2026-11-11** `e9bbb8f4` |
| FR-7 | **v2 점검 원장 · 채점** — `public.trade_check_ledger`(사용자 열 0 · 유일 (사전등록, 종목, 방향, 조건, 지평, 기준 봉) · 조건 없음 `NONE`) · export 뷰 `public.v_trade_check_ledger_export`(예측은 이 뷰만 — `DB-REQ-036` FR-3 직접 읽기 목록 고정) · `forecast.trade_check_outcome`(원장 한 줄 = 결과 한 줄) — **done 2026-11-11** `cc8d1713` · `093a494f` |
| FR-4 | **forecast 사건 종류** — 소식 행 → `event_kind` 매핑 표(`news_event_kind` — 원천 키 · 종류 · 규칙 버전) · 반응 통계는 `event_reaction_stats` 를 종류 축으로 넓힘(새 표 대신 열/키 추가 — 마이그레이션 때 정함) · 뷰 `v_news_reaction`(종류 · 수평선 · 표본 · 오른 비율 · 평균 · 선반영) — **done 2026-11-12** `6aa1b7dd`. 정정: `event_reaction_stats` 를 넓히지 않고 새 표(`news_kind_dict` · `news_reaction_stat` · `news_pre_move`) + 뷰 셋(`v_news_kind_dict` · `v_news_reaction` · `v_news_pre_move`) — 옛 표는 일정에 FK · 키 (종류, 종목)라 시장 · 출처 풀링 통계와 뜻이 다르다. 예측이 읽는 원천은 export 뷰 둘(`public.v_kr_news_title_export` · `v_news_article_export`) |
| FR-6 | **v2 등급 · 출처 라벨** — `forecast.judgment_tier`(시장 · 모드 · 행동 · 규칙 버전 · as_of · tier · live_effective_n · spread_ci_low · spread_ci_high · regimes) + 뷰 `v_judgment_tier`. `coach.judgment_ledger` 출처 열에 `backtest_full` · `backtest_price_only` · `backtest_seen` 값 허용(CHECK 넓힘 — 기존 `live` · `backtest` · `synthetic` 유지). `base_rate_stat` 에 `status`(`ok` · `below_min`) · `sample_days` · `up_low` · `up_high` · 비율 nullable(FR-3 개정) — **상태(2026-11-10): 출처 라벨 done** `f38ca6ae`(마이그레이션 `20261110200000_judgment_backtest_labels` — 원장은 지금 주인 `public.symbol_judgment_snapshots` 에 · CHECK 넓힘 · 국내 장기 `backtest` → `backtest_full` 51,305행 · 롤백 SQL 은 파일 머리). 기저율 칸은 FR-3 에서 done. **등급 done 2026-11-11**(단계 4) `fa1877a1` — 마이그레이션 `20261111160000_judgment_tier`(추가만 · 롤백 SQL 머리): `forecast.judgment_tier`(실행마다 칸마다 한 행 — 강등 이력 · CHECK 참고면 출처 없음 · 검증됨/주의면 출처 있음) · 뷰 `forecast.v_judgment_tier`(칸마다 최신) · export 뷰 `public.v_judgment_outcome_export`(채점된 판단만 · 사용자 열 0). **정정**: 계획의 '행동' 열은 없다 — spread(후보 − 피하기)는 칸(시장 × 모드)의 성질이라 행동마다 따로 셀 수 없다 |
| FR-5 | 권한 — coach 는 forecast 뷰 SELECT 만 · forecast 는 coach 표 권한 0(`DB-REQ-036` 주인 표에 행 추가) |

## Acceptance Criteria

- [ ] 마이그레이션 목적 1개씩 · 롤백 SQL · `EXPLAIN` 첨부(읽기 쿼리 셋)
- [ ] 분위 CHECK · 스냅샷 UPDATE 차단 · 뷰 계약 테스트(`salt-forecast` 쪽 + 서버 읽기)
- [ ] `DB-REQ-036` 부록 주인 표 갱신

## 계약 영향

- `SRV-REQ-053` · `FC-REQ-028` · 기존 `DB-REQ-036`(서비스별 스키마) · `DB-REQ-033`(forecast 뷰) · `ADR-007`

## FR — v4 (2026-11-13 · 전 영역 계획 `requirements/specs/in-progress/F017-v4-one-panel-global-plan.md`)

| FR | 내용 | 상태 |
|---|---|---|
| FR-8 | `cause_snapshot`(종목 · 거래일 · 지문 · `candidates jsonb` · 만든 시각) — 원인 후보 조립 결과(`SRV-REQ-053` FR-11). 덧붙이기만 · (종목, 거래일, 지문) 유일 | **done 2026-11-16**(순서 5a) — 마이그레이션 `20261116200000_cause_snapshot`(추가만 · 롤백 = DROP VIEW · DROP TABLE): (시장, 종목, 거래일, 지문) 유일 · `top_kind` · `top_strength` 열 승격(채점 조건 — JSON 조건 0) · `split` · `change_rate` · UPDATE 차단 트리거 · export 뷰 `public.v_cause_snapshot_export`(예측이 읽는 유일한 길). 첫 실측 국내 50행 · 재실행 새 행 0 · UPDATE 거부 |
| FR-9 | `extracted_fact`(원천 kind(disclosure · article) · 원문 키 · 종목 · who · what · amount NUMERIC · unit · compared_to · event_kind · published_at · `available_at` · 원문 주소 · 추출기 버전) — **기사 문장 칸 없음**(`ADR-009` 개정). (원천, 원문 키, what) 유일 · 내 데이터 아님(시장 층) | **done 2026-11-14**(2c) — 마이그레이션 `20261114120000_extracted_fact`(+ `news_ai_body.symbols` · `extract_attempts`) · `20261114120100_ai_body_symbols_backfill`. 종목은 `symbols text[]`(GIN) — 한 사실이 종목 둘에 걸릴 수 있다 · 숫자 `amount NUMERIC` · 시점 `when_text`(원문 표기) |
| FR-10 | `explanation_snapshot.sentences[].section` 값 개정 — `conclusion · cause · evidence · result · company · track · miss · caution`. 옛 값(modeReasoning …)은 읽기 호환만 · CHECK 는 새 값 | to-do |
| FR-11 | `company_brief`(종목 · 기준일 · 네 칸 jsonb · 한 줄 · 만든 시각) — 회사 사정 저장본 | **정정 2026-11-14(2d) — 표 만들지 않음**: 읽을 때 `extracted_fact` 에서 조립(GIN 한 번 0.3ms · 패널 p95 277ms). 저장본이 필요한 LLM 한 줄이 없어졌다(`SRV-REQ-053` FR-12 정정) |
| FR-12 | `forecast.coin_market_share`(종목 · 날 · β · 비트코인 수익 · 시장 몫 · 나머지 · available_at) + 뷰 `v_coin_market_share` — 예측이 쓰고 서버는 뷰만(`ADR-007`). DDL 은 서버 S5 전까지 `salt-server/prisma` | to-do |
| FR-14 | 예측 실험 전진 시험 표 넷 — `forecast.vol_range_test`(칸 × 실행 — 1차 · 전진 지표 · 상태 · 판정 수 · `live_ready` 는 pass 일 때만 CHECK) · `vol_range_prediction`(칸 × 종목 × 기준 봉 — HAR · 기준 셋 · 80 · 95 반폭 · 기록 시각 · 실현 · 제때) · `move_news_event`(사건 — 기록 시각 값 · 라벨 · 비용 · 제때) · `move_news_test`(칸 × 검정 × 출처 reference · forward). 뷰 없음 — 서버는 첫 통과 칸이 생기면(2027-01-12 ~) 뷰와 같은 PR. 추가만 | **done 2026-11-16**(로컬 적용) |

| FR-15 | **forecast 온톨로지 네 층 · 원인 설명 채점 표**(`FC-REQ-022` FR-1~4 · 13~15) — `entity` · `relation` · `fact`(bitemporal · CHECK 닫힌 목록) · `cause_candidate` · `evidence` · `outcome` · `cause_explain_test` + 함수 `f_fact_asof` · `f_relation_asof` · `f_neighbors`(3홉 상한). 쓰기 예측만 · 서버 읽기 0(판정 통과 뒤 뷰) | **done 2026-11-16**(순서 5b · 5c) — 마이그레이션 `20261116200100_forecast_ontology_cause`(추가만 · 롤백 SQL 머리) · `20261116210000_forecast_ontology_sources`(별칭 표 `entity_alias` · export 뷰 `v_extracted_fact_export` · `v_crypto_name_export` — 이름 열만) · `20261116210100_forecast_neighbors_hub`(3홉 다시 씀 — 시장 허브를 지나지 않음 · `f_fact_asof` 엔티티 인자). 3홉 종목 p95 95ms |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-12 | **단계 6** FR-4 done `6aa1b7dd` — 마이그레이션 `20261112100000_news_reaction`(추가만 · 롤백 머리 주석). 정정은 FR-4 행 |
| 2026-11-11 | **단계 5**(`feat/f017-s5-short-direction`) FR-2 done `d0e79ff6` — 표 셋 · 뷰 둘. 정정: 시험 표 · 결과 표가 계획에 없었다(사유 · 성적 · 라이브 채점 자리). 롤백 실제로 한 번 돌림(개발 중 칸 추가 두 번 — drop · 다시 적용) |
| 2026-11-11 | **단계 3**(`feat/f017-s3-explain-always`) — FR-1 done(해설 스냅샷 표 · 트리거 · 인덱스) |
| 2026-11-11 | **단계 2**(`feat/f017-s2-checks-plain-line`) — FR-3 done(키를 시장 풀링으로 · 라이브 문턱 표 · `applies_to` · `ref_at`) · FR-7 신규 done(점검 원장 · export 뷰 · 채점 표). 마이그레이션 셋 전부 추가만(`20261111120000` · `130000` · `140000`) |
| 2026-11-10 밤 | **v2** — FR-6 등급 표 · 뷰 · 원장 출처 라벨 · 기저율 `below_min` 칸(`FEATURE-017` v2) |
| 2026-11-10 | 신규(to-do) — `FEATURE-017` 개정(범위 "잘 사고 잘 팔기") |
| 2026-11-10 밤(1b) | to-do → in-progress — FR-6 출처 라벨 done(`f38ca6ae`, 마이그레이션 `20261110200000_judgment_backtest_labels`). 라벨을 단 원장은 계획의 `coach.judgment_ledger` 가 아니라 지금 3종이 읽는 `public.symbol_judgment_snapshots` — 계획 문장 정정 |
| 2026-11-11 | **단계 4**(`feat/f017-s4-grade`) — FR-6 등급 표 · 계약 뷰 · 판단 원장 export 뷰 done(`fa1877a1`). 정정: 행동 열 없음. `EXPLAIN (ANALYZE, BUFFERS)`(확인 2회차) — 서버 읽기 `v_judgment_tier` PK 인덱스 스캔 0.45ms · 4행 / 배치 읽기 export 뷰 원장 순차 스캔 16만 행 67ms(하루 한 번 전부 읽는 배치 — 예산 안) |
| 2026-11-12 | F016 단계 D(짝 — 이 REQ 가 머리 주인인 파일): coach `application/api/index.ts`(머리 주인) 조립에 유스케이스 둘(`getMoveSummary` · `generateMoveSummaries`) · 의존 없으면 꺼짐(테스트 조립) |
| 2026-11-12 | 서버 S3b 짝(`MONEY-S3b-identity-accounts`): `coach/application/api/index.ts`(머리 주인) — 의존 `coachedUsers` · 유스케이스 `listCoachedUsers`(사람마다 배치 대상, `users` 읽기 0). 스키마 몫 변경 0 |
| 2026-11-13 | **v4**(`requirements/specs/in-progress/F017-v4-one-panel-global-plan.md`) — FR-8 원인 후보 스냅샷 · FR-9 추출 사실(문장 칸 없음) · FR-10 해설 칸 이름 · FR-11 회사 사정(to-do) |
| 2026-11-13 | FR-12 코인 시장 몫 표 · 뷰(`FC-REQ-028` FR-12 · `SRV-REQ-053` FR-17) |
| 2026-11-13 | F017 v4 순서 1a 짝(`feat/f017-v4-s1-scenario-always` — 이 REQ 가 머리 주인인 파일): `coach/application/api` 조립에서 `GetSymbolScenario` 가 기저율 리더를 같이 받는다 — 표 · 뷰 변경 0(읽는 뷰 `v_base_rate` · `v_base_rate_trigger` 그대로). 주인 REQ `SRV-REQ-053` FR-10 · `BFF-REQ-052` FR-4 · `FE-REQ-064` FR-8 |
| 2026-11-13 | F017 v4 1d 짝(`SRV-REQ-053` FR-13) — `coach/application/api/index.ts`(머리 주인) 조립: `getCoachPanel` · 의존 `moveCauses` · 해설 · 시나리오 · 점검 인스턴스를 패널과 칸별 경로가 같이 쓴다. 스키마 · 표 변경 0 |
| 2026-11-14 | **FR-9 `extracted_fact` done**(F017 v4 2c) — 표 하나 · 인덱스 셋 · 사용자 열 0 · 문장 칸 0. 되돌리기 = 표 지우기 + `news_ai_body` 열 둘 |
| 2026-11-14 | FR-11 `company_brief` 표는 만들지 않음 — 읽을 때 조립(2d) |
| 2026-11-16 | FR-3 개정(F017 v4 순서 3a · 루트 `requirements/specs/in-progress/F017-v4-stage3-intraday-slice.md`) — `base_rate_stat.horizon_unit`(day · hour, 기본 day) · `v_base_rate` 끝 열 · export 뷰 `public.v_kr_vi_export`(예측이 VI 를 읽음). 추가만 — 되돌리기 = 뷰 원래 정의 + 열 지우기 · 뷰 지우기 |
| 2026-11-16 | **FR-13 신규**(F017 v4 순서 3b · 루트 `requirements/specs/in-progress/F017-v4-stage3-intraday-slice.md`) — `forecast.event_window` · `event_window_stat` · 뷰 `v_event_window_stat`(시장마다 최신 실행) · export 뷰 `public.v_dart_filing_export`(+ `rcept_date` 끝 열). 추가만 |
| 2026-11-16 | **FR-14 신규**(F017 v4 순서 4 · 루트 `requirements/specs/in-progress/F017-v4-stage4-experiment-slice.md`) — 예측 실험 H1 · H3 표 넷. 추가만 — 되돌리기 = 표 넷 지우기 |
| 2026-11-16 | FR-8 done · **FR-15 신규**(F017 v4 순서 5 · 루트 `requirements/specs/in-progress/F017-v4-stage5-ontology-slice.md`) — 원인 스냅샷 · 온톨로지 표 일곱 · as-of 함수 셋. 추가만 |
| 2026-11-16 | FR-15 확대(순서 5b-2) — 별칭 표 · export 뷰 둘 · 3홉 · as-of 함수 다시 씀. 추가만(함수는 CREATE OR REPLACE) |
| 2026-11-16 | FR-15 — 수급 export 뷰 둘(`v_kr_investor_flow_export` · `v_kr_program_flow_export`, 마이그레이션 `20261116210200`) · `forecast.fact.value_num` double → numeric(`20261116210300` — 원화 금액이 들어와서, db-contract §3) |
| 2026-11-17 | F008 슬라이스 24 2단계(`feat/f008-slice24-s2-earnings-window`, 루트 `requirements/specs/in-progress/F008-slice24-kr-market-events-slice.md`) — 짝 — `extracted_fact` 저장이 원문 키 단위로 바꿈(다시 추출하면 같은 '무엇'은 같은 id 갱신 · 안 나온 것 지움, `SRV-REQ-058` FR-9). 실DB 시험 행으로 확인 |
| 2026-11-18 | 변경 없음 기록 — 이 REQ 가 머리 주인인 coach `application/api/index.ts` 에 측정 유스케이스 `compareAgentExplanation` 조립만 더했다(주인 `SRV-REQ-059`). 스냅샷 표 · 뷰 변경 0. 루트 `requirements/specs/in-progress/F008-O3-agent-tools-slice.md` |
