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

## 2026-11-16 — F017 v4 순서 3a

- FR-3 개정 마이그레이션 둘 로컬 적용(추가만) — `horizon_unit` · `v_kr_vi_export`. 예측 스키마 계약 시험 통과

## 2026-11-16 — F017 v4 순서 3b

- FR-13 표 둘 · 뷰 둘 로컬 적용(추가만) · 예측 스키마 계약 통과

## 2026-11-16 — F017 v4 순서 4

- FR-14 표 넷 로컬 적용(`20261116180000_forecast_experiment_h1_h3`, 추가만) · 예측 스키마 계약 시험 통과 · 첫 실행 580 + 226 행

## 2026-11-16 — F017 v4 순서 5

- FR-8 · FR-15 — 마이그레이션 둘 로컬 적용(`prisma migrate deploy`) · UPDATE 거부 실측 · 예측 스키마 계약 시험 통과 · 3홉 p95 29ms(300회) · as-of 무작위 1,000회 미래 행 0. 표는 루트 `requirements/reports/checklists/F017-v4-stage5-ontology.md`


## 2026-11-17 — F008 슬라이스 24 2단계(`feat/f008-slice24-s2-earnings-window`, 루트 `requirements/specs/in-progress/F008-slice24-kr-market-events-slice.md`)

이 REQ 몫: 짝 — `extracted_fact` 저장이 원문 키 단위로 바꿈(다시 추출하면 같은 '무엇'은 같은 id 갱신 · 안 나온 것 지움, `SRV-REQ-058` FR-9). 실DB 시험 행으로 확인

| 항목 | 상태 | 근거 |
|---|---|---|
| 빌드 · 린트 · 레이어 | 충족 | `npm run build` 0 · `npm run lint` 0 · `npm run test:layer-check` 차단 10 · 통과 6 |
| 단위 시험 | 충족 | `npm test` 1730/1730 — 새 시험 `dartEarnings`(실제 원문 픽스처 9건 · 분류 경계 표 19 · 결산 이름 8) · `collectDartEarnings` 6 · `refetchDartBodies` 2 · `dartDecode` 2 · `earningsOutlook` 11 · `macroEvents` 경계 |
| 마이그레이션 | 충족 | `20261117120000` · `120100` · `120200` 로컬 적용 — 추가만(표 · 뷰 · CHECK 넓히기 · 열 하나) |
| 실데이터 수집 | 충족 | DART 실호출: 유니버스 51종목 2016~ 실적 공시 5,245 · IR 4,006 · 예고 586 · 최근 1년 IR · 예고 본문 561건 전부 읽음(실패 0) — 실적 IR 174 · 결산 기간 158 |
| 분류 표본 눈 확인 | 충족 | IR 12건 무작위 — 첫 판 거짓 양성 2(기아 CLSA · 신한 MS: 내용 칸만 실적) → '개최목적' 칸만 · 결산 기간으로 고침 |
| EXPLAIN | 충족 | 새 쿼리 다섯 0.4~4.9ms — 대기 본문 부분 인덱스 · 종목 날짜 인덱스 · `event_reaction_stats_latest` |
| 응답(실DB · 프로세스 안) | 충족 | `GetSymbolEvents` 실DB 005930 · 000660 · 000270 · 035420 · BTC — 창 · 적중 · 빗나간 결산 · 반응 게이트, 코인 `null`, 1~24ms |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| HTTP 실토큰 응답(서버 · BFF 경로) | 로컬 옛 HS 창이 닫혀(11-16) 소유자 토큰을 만들 수 없다 — 서명 키 읽기는 권한 거부. 같은 유스케이스 · 리더 · 정책을 실DB 로 프로세스 안에서 돌렸다 | 사용자 로그인 화면 QA(`QA-001`) |
| DART 본문 다시 받기 실회차 | 서버 · 뉴스 워커가 새 코드로 같이 재기동해야 한다(옛 서버 추출은 옛 사실을 안 지운다) | 머지 · `ops/salt.sh restart server news` 뒤 첫 회차 — 634건 · 하루 안 |

## 2026-11-18 — F008 O3 해설 에이전트 도구(`feat/fc-req-023-agent-tools`)

- 이 REQ 몫 변경 0 — 같은 파일에 측정 유스케이스 조립. 해설 스냅샷 저장 경로 무변경(측정은 저장 0)

## 2026-11-18 F006 코치 대화 1단계 — 같은 파일

- 이 REQ 항목 변경 0 · 영역 검증 전체 통과(루트 체크리스트 `F006-coach-conversation.md`)

## 2026-11-18 — F006 대화 2단계 짝(`feat/f006-coach-conversation-s2`)

- `coach/application/api/index.ts`(머리 주인) 조립에 대화 재료 묶음 · `ReadConversationCard` · `GetCoachBriefing`(주인 `SRV-REQ-028`). 이 REQ 의 표 · 뷰 변경 0 — 영역 시험 전부 통과

## 2026-11-19 PC 격자 짝(`feat/f006-pc-panel-grid`, 파일만 걸침)

- 코치 공개 API 조립 파일에 패널 배치 유스케이스 둘
- 미충족: 없음(이 REQ 몫 변경 0) · 근거 루트 체크리스트 `requirements/reports/checklists/F006-pc-panel-grid.md`

## 2026-11-19 코치 대화 재설계가 걸침

- 코치 조립 의존(`CoachDependencies`)에 주간 계획 소스 한 줄(`feat/f006-coach-chat-redesign`) — 표 · 뷰 변경 0
- 확인은 `FE-REQ-030` 체크리스트 2026-11-19 코치 대화 재설계 절

## 2026-11-26 — 서버 S4a 밴드 적립 → Kotlin portfolio(`MONEY-S4a-portfolio-plan`, `feat/srv-req-049-s4-portfolio`)

- 파일만 걸침 — coach 조립 의존 한 줄 삭제. 검증은 루트 체크리스트(`./gradlew check` · Express · BFF 시험)
- 미검증: 없음(이 몫 안)

- 2026-11-26 — `explanation_snapshot` 보존 — 최근 5벌 + 최근 30일은 KST 날마다 마지막 한 벌(`SRV-REQ-063` FR-3). 스키마 변경 0
