---
id: SRV-REQ-053
feature: F017
area: server
kind: FUNC
title: "coach · market — 결함(화면이 외부 호출을 기다리지 않음) · 관망도 판단 · 보류 사실 · 해설 늘 보이게(스냅샷 배치 · 4단) · 사기/팔기 점검 · 시나리오 · 측정 태그"
priority: high
created: 2026-11-09
source: pm/requirements/specs/in-progress/FEATURE-017-ai-coach-best-case.md
---

## Summary

`FEATURE-017` 서버 몫. 서비스 = **coach**(판단 · 해설 · 점검 · 시나리오) + **market**(호가 · 대시보드 · 국내 표 · 소식 — FR-0 · 태그 읽기). 둘 다 Express(S6 전, `msa-services.md` §3).
결정 `ADR-010`(채택 11-10) · `ADR-009` 개정(측정 태그) · `ADR-003`(시나리오 소유자 전용). 판정 · 확률은 채점된 규칙 · 모델(예측 뷰) — LLM 은 문장만.

> **v2 (2026-11-10 밤, `FEATURE-017` v2 · `ADR-010` v2)** — 판단을 막지 않는다: `renderable` · `blockedReason` 대신 `caveats[]`, 3종은 늘 다(라이브 모자라면 과거 검산 성적 · 사례로 채움 — 라벨, 그래도 비면 결함 꼬리표).
> FR-1 · 2 · 4 를 그 자리에서 고쳤고 FR-7(라벨 등급) · FR-8(3종 결함 세기)을 더했다. 국내 단타 포함. 수집은 `SRV-REQ-057`.
>
> **2026-11-10 개정 — 범위 "잘 사고 잘 팔기"**(`FEATURE-017` 머리 블록). 11-09 FR-6(짧게 먼저) · FR-7(물어보기) · FR-8(해설 채점 지표) · FR-9(엔진 v3)는 뺐다(Non-Goals).
> FR-0(결함 — 오늘 고침) · FR-4(점검) · FR-5(시나리오) · FR-6(태그)을 새로 둔다. 번호는 다시 매겼다.

## 착수 전 네 질문(`msa-services.md` §1)

| 질문 | 답 |
|---|---|
| 서비스 | coach(판단 · 해설 · 점검 · 시나리오) · market(FR-0 · 태그 응답) |
| 단계 | Express(S6 전). 새 표는 `DB-REQ-043`(Prisma — S6 이전 때 Flyway 로) |
| 표 주인 | coach: `explanation_snapshot`(쓰기) · `judgment_ledger`(읽기). 예측 뷰(`v_short_horizon_card` · `v_base_rate` · `v_news_reaction`)는 forecast 주인 — coach · market 은 읽기만 |
| BFF 계약 | `BFF-REQ-052` |

## 불변식

1. **요청 경로는 저장값만 읽는다** — 외부 API · LLM 호출 0. 늦으면 받아 둔 값 + 기준 시각(FR-0 이 처음 박은 선, FR-3~6 에도)
2. **시장 층은 사람마다 같다** — 확률 · 기저율 · 태그 · 해설은 종목(· 모드)마다 한 번. 사람별 값은 내 층(팔기 전 점검 · 내 성적)뿐이고 LLM 입력에 0
3. **명령 0** — 응답에 "사세요 · 파세요" 같은 행동 지시 칸이 없다(조건 · 분포 · 표본 · 무효선만)
4. **v2 판단은 숨기지 않는다 · 3종은 늘 다** — 모드 판단 응답에 판정 · 관측 · 성적 · 빗나간 사례가 언제나 있다. 성적 출처 `live` 가 표본 < 20 이면 `backtest`(국내 `kr-judgment-backtest@1` · 코인 `FC-REQ-028` FR-5)로 채우고 출처를 칸에 적는다 — 두 출처 숫자를 합치지 않는다
5. **v2 라이브만 승격** — 등급 "검증됨"은 라이브 성적으로만(FR-7)

## FR

| FR | 내용 | 단계 | 상태 |
|---|---|---|---|
| FR-0 | **결함(2026-11-10 전 종목 실측)** ① 국내 호가 — KIS 우선순위 `viewer`(폴링 앞) + 받아 둔 값을 바로 주고 뒤에서 새로 받기 · 처음 보는 종목만 2초 상한 → `pending`(`001aac19`, 1.5~22초 → 15~190ms) ② 코인 상세 대시보드 15초 캐시 · 지나면 받아 둔 값 + 뒤 계산(`7e0e9174`, 1.9초 → 37~157ms) ③ 국내 시세 표 = 유니버스만(`432f5d38`, 멈춘 7행 → 0) ④ 국내 소식 오늘이 비면 최근 7일 `scope: recent`(`f73bbc9f`, 빈 칸 11/57 → 표본 3종목 채움) | 0 | **done** |
| FR-1 | **관측 근거 · v2 3종 늘** — 모드 판단 응답에 `observations[]`: `{ item, value, lower, upper, distance, points, missing }`(문턱은 규칙 버전 상수). 같은 판정의 `components` 와 같은 값(원장 대조 테스트). `judgmentEvidence` = 문장 ∪ 관측(결측 아님) — 관측 ≥ 1 이면 근거(`ADR-010`). **v2**: 판정 · 관측 · `trackRecord` · `failureCases` 는 늘 실린다(국내 단타 포함 — `SRV-REQ-040` FR-63 재개). 라이브 표본 < 20 · 빗나간 사례 0 이면 같은 판단 유형의 과거 검산 성적 · 사례로 채우고 `trackRecord.sampleOrigin` + `liveSample` 을 같이 — 숫자 합산 0 | 1 | **done(`d6105374`)** — 채울 과거 검산이 아직 없는 유형(코인 전부 · 국내 단타)은 결함 꼬리표(FC-028 FR-5 · SRV-040 FR-63 이 채운다) |
| FR-2 | ~~**보류 사실** — `reasons_missing` 삭제. 남은 사유마다 `blockedFacts`: 재료 멈춤 `{ item, lastAt }` · 이력 `{ have, need }` · 표본 `{ sample, min }` · 투자유의 `{ since }` · 열지 않은 모드 `{ assetClass, mode }` · 실패사례 0 `{ sample }`~~ **v2 꼬리표 `caveats[]`** — `reasons_missing` 삭제 · `renderable` · `blockedReason` 은 모드 판단에서 없앤다. 해당하는 것 **전부**: 재료 멈춤 `{ reason: stale_inputs, items[{ item, lastAt }] }` · 이력 짧음 `{ insufficient_history, have, need, dailyIndicator }` · 라이브 적음 `{ live_sample_short, live, min, backtest }` · 투자유의 `{ exchange_warning, cautions, checkedAt }`(지정 시각은 모른다 — 지어내지 않음) · 결함: 재료 전부 결측 `{ inputs_missing, items }` · 성적 조회 실패 `{ track_record_unavailable }` · 과거 검산도 없음 `{ backtest_missing }`. 순서 = 대상 → 재료 → 성적. 경계 표 테스트 | 1 | **done(`d6105374`)** — 국내 단타 막음(`mode_not_open`) 삭제 · 해설도 판단 꼬리표로 막지 않음(`facts_unavailable` 만) |
| FR-3 | **해설 늘 보이게** — ① 사실표 조립(관측 · 성적 · 실패 사례 · 같은 날 사실(`FEATURE-016` ②) · 점검 · 태그 — id 붙임) ② **스냅샷 배치**: 종목 지문(판정 · 관측 구간 · 확률 구간 · 태그 · 규칙 · 프롬프트 · 검증기 버전 해시)이 바뀐 종목만 생성(로컬 → 대체 공급자 → 템플릿) → 검증기(숫자 · 인용 id · 금지어 · 명령형 — `FEATURE-008` FR-49 · `ADR-009` 표 한 벌) → `explanation_snapshot` 저장. 실패한 생성은 쓰지 않고 이전 성공본 유지 ③ **읽기 4단**: 최신 AI → 이전 AI + `generatedAt` → 사실표 템플릿(`tier: template`, AI 표시 없음) → "특이 소식 없음" + 판정 근거(`tier: none`) — 빈 칸 0 | 3 | **done 2026-11-11**(`feat/f017-s3-explain-always`) — 지문 = 판정 · 관측이 문턱 어느 쪽인가 · 꼬리표 · 맨 위 뉴스 3 · 규칙 · 프롬프트 · 검증기 버전(가격 · RSI 소수점은 넣지 않음 — 매 분 다시 만들지 않게, 문장은 만든 시각을 같이) · 배치 = 10분(:05) 따로 · 최근 본 종목 먼저 ∪ 추적 × 두 모드 · 회차 12 · 로컬 CLI(배치 표지 — 공용 문장 하나) → Gemini · 검사를 통과한 LLM 문장이 하나라도 있어야 저장 · 이전 단은 **같은 방향 · 판단 기간 안**만 · 문장마다 인용(사실표 id). **정정 ①**: 사실표에 점검 · 같은 날 사실 숫자는 넣지 않는다 — 같은 화면의 점검 칸 · "왜 움직였나" 카드가 그 숫자를 그려 해설이 되풀이하면 같은 숫자 두 번(`screen-desktop.md` §5). 태그는 단계 6. 옛 `POST /explain` · `/explain/stream` 은 소비처와 함께 지움(제거 = 404) |
| FR-4 | **v2 주인공 — 사기 전 · 팔기 전 점검 + 쉬운 한 줄** `GET /api/coach/check?symbol&side` — **v2**: 응답 머리에 `summary`(서버가 실제 숫자로 만든 한 문장 — 조건 · 기간 · 시장 단위를 같은 문장에, 국내 "다음 거래일 종가까지" · 코인 "4시간 뒤") · `status: ok | below_min | no_condition` · `sample` · `sampleDays` · `upRange`(Wilson, 클러스터 유효 n). 유효 n < 100 이면 `below_min` + 비율 0 · "비슷한 상황이 아직 n번뿐이에요". 팔기 전 `summary` 에 매입가 · 내 손익 0(리서치 v2 규칙 9 — 확정 손익은 펼침 칸 `realizedPct` 에만). `differsFromUsual` 은 수축 · Holm 통과 때만. 기존: 사기 전: 지금 상태가 맞는 사전등록 조건(`v_base_rate` — `FC-REQ-028` FR-2)의 분포 `{ condition, horizon, sample, upRate, mean, q10, invalidationGap, chase, preMove }`. 팔기 전: 보유(포트폴리오 공개 API — 서버 계산) 확정 손익 + 같은 조건 보유 연장 분포 `{ realizedPct, hold: { sample, q10, q50, q90 } }`. 조건에 맞는 행이 없으면 `status: no_condition`(지어내지 않음). 점검마다 원장에 한 줄(나중 채점) | 2 | **done 2026-11-11** `dd9a2782` — 실측 349종목: 코인 성립 12 · 국내 5 · 조건 없음 332 · p95 65ms. 결정: 문턱 비교만(정의 한 곳) · **시세가 기준 봉보다 뒤일 때만 다음 장 문턱**(묵은 시세 결함에서 나온 규칙) · 조건 없음은 평소 값 · `invalidationGap` · `chase` · `preMove` 는 빼고 분위 · 조건 이름으로(새 계산 0) |
| FR-5 | **시나리오** `GET /api/coach/scenario?symbol` — `v_short_horizon_card`(`FC-REQ-028` FR-1) 1h · 4h · 1d `{ renderable, blockedReason, pUp, q10, q50, q90, invalidation, track{ calls, hits, baseline, misses[] } }`. 시험 통과 표지가 없는 모델 · 지난 예측(기준 시각 + 수평선 지남)은 `renderable: false` + 사유. **소유자 판정**(`ADR-003` — `ownerGateScope.test.ts` 허용표에 이 경로 추가) | 3 | to-do |
| FR-7 | **v2 라벨 등급** — 모드 판단에 `tier: reference | verified | caution` + `tierBasis{ liveEffectiveN, spreadCi, regimes }`. 값은 예측 뷰(`FC-REQ-028` FR-6 `v_judgment_tier`)를 읽기만 — 서버가 문턱을 다시 계산하지 않는다. 뷰가 없거나 늦으면 `reference`(지어내지 않음). 등급은 판단을 숨기지 않는다 | 4 | **done 2026-11-11** `a584ea21` — `toJudgmentTier`(행 없음 · 3일 넘음 · 모르는 값 · 출처 어긋난 검증됨/주의 → 참고 `not_computed`) · `PrismaJudgmentTierReader`(뷰 한 문장 · 4행) · 모드 뷰에 `tier` · `tierBasis{ source, reason, liveEffectiveN, minEffectiveN, spreadCi, regimes, asOf }` · Swagger. 못 읽어도 판단은 그대로 |
| FR-8 | **v2 3종 결함 세기** — 판단 응답을 만들 때 결함 꼬리표(`inputs_missing` · `track_record_unavailable` · `backtest_missing`)가 붙은 수를 시장 · 모드별로 셈(10분 로그 한 줄 `coach-triad-gaps`) — `OPS-003` 상태 점검이 읽는다. 수용 기준은 0 | 1 | done `e1248195` |
| FR-6 | **측정 태그** — 국내 소식(`GetKrStockNews`) · 코인 뉴스 · 일정 응답 행에 `eventKind` · `reaction{ days, sample, upRate, mean }` · `preMove5d` · `label`(`up_usually` · `down_usually` · `mixed` — 표본 · 엇갈림 문턱은 서버 설정). `v_news_reaction`(`FC-REQ-028` FR-3) 읽기만. 호재 · 악재 단어 0 | 4 | to-do |

## Acceptance Criteria

- [x] FR-0 — 호가 경계 표 테스트(받아 둔 값 · 처음 보는 종목 상한 · 뒤 갱신 실패 → stale · 30초) · 대시보드 테스트 4 · 국내 표 유니버스 · 소식 recent 테스트 · 실측 전후 수치(커밋 본문)
- [x] 관측 = 원장 `components`(경계 표: 결측 · 문턱 위 · 아래 · 같음) — `judgmentObservation.test.ts`
- [x] **v2** 판단 응답에 판정 · 관측 · 성적 · 빗나간 사례 칸이 100% · `renderable` · `blockedReason` 0 · 꼬리표 · 3종 출처 경계 표 · 라이브/과거 검산 합산 0 — `npm test` 1129
- [ ] **v2 3종 결함 0** — 실측 2026-11-10(코인 거래대금 상위 100 + 국내 유니버스 50, BFF 150요청): 판단 보임 300/300 모드(전 코인 단타 33 · 장기 0 · 국내 단타 0 · 국내 장기 38/57) · 3종 다 있음 코인 단타 90 · 국내 장기 50(21 은 과거 검산으로 채움) · 3종 결함 160(코인 장기 100 · 국내 단타 50 · 코인 단타 10 — 코인 과거 검산 `FC-REQ-028` FR-5 · 국내 단타 원장 `SRV-REQ-040` FR-63 이 채운다) · BFF p50 33ms · p95 94ms
- [ ] **v2** 점검 `summary` 숫자 = 기저율 뷰 · n < 100 이면 비율 0 · 팔기 전 `summary` 매입가 · 손익 0(테스트) · 등급 = 뷰 값
- [x] 해설 4단 경계 표(최신 · 이전 · 템플릿 · 없음) · 검증기 거절 표 · 실패 생성은 저장 0 · 요청 경로 LLM 0(테스트로 셈) — `explanationSnapshot.test.ts` 27 · `explanationSnapshots.test.ts` 9(읽기 유스케이스는 `CoachExplainer` 를 받지 않는다 — 받을 자리가 없다)
- [ ] 점검 · 시나리오 · 태그 숫자 = 예측 뷰 값 · 명령형 칸 0 · 시나리오 비소유자 404
- [ ] LLM 입력 타입에 보유 · 금액 · 이메일 칸 0
- [ ] `ai-coach/*` 서버 p95 ≤ 300ms(BFF 400ms 안)

## 계약 영향

- BFF `BFF-REQ-052` · FE `FE-REQ-064` · 예측 `FC-REQ-028` · DB `DB-REQ-043`
- 기존: `SRV-REQ-024`(코치 판단) · `SRV-REQ-037`(해설) · `SRV-REQ-050`(LLM 라우팅) · `SRV-REQ-052`(F016 ③ 검증기 공유) · `SRV-REQ-040` · `042`(국내 호가 · 표 — FR-0) · `SRV-REQ-051`(국내 소식 — FR-0 ④)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-09 | 신규(to-do) — `FEATURE-017` · `ADR-010`(제안) |
| 2026-11-10 밤(구현) | FR-1 · 2 done `d6105374` · Swagger 정정. 실측 2026-11-10(코인 거래대금 상위 100 + 국내 유니버스 50, BFF 150요청): 판단 보임 300/300 모드(전 코인 단타 33 · 장기 0 · 국내 단타 0 · 국내 장기 38/57) · 3종 다 있음 코인 단타 90 · 국내 장기 50(21 은 과거 검산으로 채움) · 3종 결함 160(코인 장기 100 · 국내 단타 50 · 코인 단타 10 — 코인 과거 검산 `FC-REQ-028` FR-5 · 국내 단타 원장 `SRV-REQ-040` FR-63 이 채운다) · BFF p50 33ms · p95 94ms. 판단 상세 504 오늘 10시 이후 6건(약 710요청 · 1건은 재시작 직후 첫 연결 — 프로세스 첫 요청 약 170ms 연결 열기) — FR-0 잔여, 관찰 |
| 2026-11-10 밤 | **v2** — FR-1 3종 늘(과거 검산으로 채움) · FR-2 보류 사실 → 꼬리표 `caveats[]`(결함 셋 포함) · FR-4 쉬운 한 줄 `summary` · `below_min` · FR-7 등급 · FR-8 3종 결함 세기 신규 · 불변식 4 · 5. 1a 도메인 진행(미커밋) |
| 2026-11-10 | to-do → in-progress. **개정 — 범위 "잘 사고 잘 팔기"**: FR-0 결함 넷 done(`001aac19` · `7e0e9174` · `432f5d38` · `f73bbc9f`) · FR-3 해설 = 스냅샷 배치 + 4단 · FR-4 점검 · FR-5 시나리오(소유자) · FR-6 측정 태그 신규. 뺀 것: 짧게 먼저 · 물어보기 · 채점 지표 · 엔진 v3. 불변식 셋 |
| 2026-11-10 밤(1b) | 3종 채움 완성 — 코인 · 국내 단타 과거 검산(`signal-skill@1` `03771c6f` → `f38ca6ae`) · 국내 단타 라이브 원장(`326a0553`). 실측(서버 150요청 · 300모드): 3종 결함 **160 → 6**(남은 6 = 코인 장기 피하기, 과거 검산 판단 날 8 < 10) · p95 40ms |
| 2026-11-11 | FR-8 done — `attachJudgmentTrack` 한 곳에서 결함 꼬리표가 붙은 종목 수(시장 · 모드, 같은 종목 한 번 · 나중 응답이 지우면 빠짐) · 10분 줄 `🧩 3종 결함 10분` · 상태 점검(`OPS-003`)이 읽음. 첫 줄 10:40 합 0(25종목 × 두 모드) |
| 2026-11-11 | **단계 2**(`feat/f017-s2-checks-plain-line`) FR-4 done `dd9a2782` — `GET /api/coach/check` · 원장 한 줄. 실데이터 대조 결함 하나(한 달 묵은 밀려난 종목 시세를 어제 종가 문턱과 비교해 '상한가 근처') → 규칙으로 고침(시세 시각 > 기준 봉일 때만 `next`, 아니면 `closed`). 코인 요약 기간은 '4시간 뒤'가 아니라 '하루 동안' — 일봉 기저율이라 지평 1일(4시간은 단계 5 단타 확률) |
| 2026-11-11 | **단계 3**(`feat/f017-s3-explain-always`) FR-3 done — `explanation_snapshot` · 배치 `GenerateExplanationSnapshots`(10분 :05) · 읽기 `GET /api/ai-coach/explanation`(4단) · 옛 즉석 경로 둘 삭제. 실데이터: 첫 회차 후보 106(추적 53 × 2) · 생성 12 · 실패 0 · 로컬 Claude 약 15초/벌 · 읽기 27~115ms. 확인 중 결함 둘 고침 — 검사가 전부 버린 생성이 `llm_checked` 로 저장되던 것(남은 LLM 문장 ≥ 1 일 때만) · "판단 뒤 24시간"을 시세로 인용하던 것(옮긴 사실 글 안 숫자는 다시 맞추지 않음) |
| 2026-11-11 | **단계 4**(`feat/f017-s4-grade`) — FR-7 done(`a584ea21`). 지금 등급은 네 칸 다 참고(`no_candidate`) — 판단 화면에 이유 · 유효 표본 n/620 |
