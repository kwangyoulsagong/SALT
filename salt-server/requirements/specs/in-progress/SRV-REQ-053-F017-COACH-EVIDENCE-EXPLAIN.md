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
| FR-5 | **시나리오** `GET /api/coach/scenario?symbol` — `v_short_horizon_card`(`FC-REQ-028` FR-1) 1h · 4h · 1d `{ renderable, blockedReason, pUp, q10, q50, q90, invalidation, track{ calls, hits, baseline, misses[] } }`. 시험 통과 표지가 없는 모델 · 지난 예측(기준 시각 + 수평선 지남)은 `renderable: false` + 사유. **소유자 판정**(`ADR-003` — `ownerGateScope.test.ts` 허용표에 이 경로 추가) | 3 | **done 2026-11-11**(단계 5 `74289a7a`) — `GetSymbolScenario` · 정책 `shortHorizon.ts`(막힘 순서: 칸 없음 → 시험 3일 넘음 → 칸 못 넘음 → 예측 없음 = `outside_universe` → 만료 · 버전 다름 = `stale`) · 뷰 두 개 한 번씩 · 뷰 실패 = `not_tested`(500 아님). **정정**: 응답 칸 이름 `range{lowPct, midPct, highPct}`(기준 가격 대비 % — 서버가 ln 수익을 바꿈) · `track{origin, calls, hits, alwaysUpHits, window, misses}` — `baseline` 은 같은 확신 행 늘 오른다 적중 수(`alwaysUpHits`). 막혀도 `track` 을 싣는다(왜 말하지 않는지의 근거) |
| FR-7 | **v2 라벨 등급** — 모드 판단에 `tier: reference | verified | caution` + `tierBasis{ liveEffectiveN, spreadCi, regimes }`. 값은 예측 뷰(`FC-REQ-028` FR-6 `v_judgment_tier`)를 읽기만 — 서버가 문턱을 다시 계산하지 않는다. 뷰가 없거나 늦으면 `reference`(지어내지 않음). 등급은 판단을 숨기지 않는다 | 4 | **done 2026-11-11** `a584ea21` — `toJudgmentTier`(행 없음 · 3일 넘음 · 모르는 값 · 출처 어긋난 검증됨/주의 → 참고 `not_computed`) · `PrismaJudgmentTierReader`(뷰 한 문장 · 4행) · 모드 뷰에 `tier` · `tierBasis{ source, reason, liveEffectiveN, minEffectiveN, spreadCi, regimes, asOf }` · Swagger. 못 읽어도 판단은 그대로 |
| FR-8 | **v2 3종 결함 세기** — 판단 응답을 만들 때 결함 꼬리표(`inputs_missing` · `track_record_unavailable` · `backtest_missing`)가 붙은 수를 시장 · 모드별로 셈(10분 로그 한 줄 `coach-triad-gaps`) — `OPS-003` 상태 점검이 읽는다. 수용 기준은 0 | 1 | done `e1248195` |
| FR-6 | **측정 태그** — 국내 소식(`GetKrStockNews`) · 코인 뉴스 · 일정 응답 행에 `eventKind` · `reaction{ days, sample, upRate, mean }` · `preMove5d` · `label`(`up_usually` · `down_usually` · `mixed` — 표본 · 엇갈림 문턱은 서버 설정). `v_news_reaction`(`FC-REQ-028` FR-3) 읽기만. 호재 · 악재 단어 0 | 4 | **done 2026-11-12**(단계 6 — `d30efe09` · `4897a68d` · `250b6dd8` · `5d891c4f` · `67e864d7`). 정정 셋: ① 칩 문턱은 서버 설정이 아니라 **사전등록**(`news-reaction@1` — 설정으로 두면 등록과 화면이 갈라진다) · 라벨 넷째 `few`(같은 종류 n건뿐 — 막지 않음) ② 새 제목도 바로 — 서버가 예측 사전(뷰)으로 분류(공용 사례 표로 파이썬과 같은 답) ③ 평균 · 선반영은 단순 비율로 내려 준다(화면 계산 0). 코인 뉴스는 market 종목 뉴스 경로 · "왜 움직였나" 같은 날 사실에도. 일정 행 태그는 범위 밖(기존 일정 카드가 반응 분포를 이미 보인다). 국내 제목 1년 백필 · 보관 30 → 400일 |

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

## FR — v4 한 장 패널 (2026-11-13 · 전 영역 계획 `requirements/specs/in-progress/F017-v4-one-panel-global-plan.md`)

> 사용자 2026-11-13: *"시나리오 … 모든 종목에 항상 떠야"* · *"사람들은 원인 근거 결과 이게 중요"* · *"우린 다 데이터가 있는데"* · *"회사 사정 얘기도"* · *"스트리밍"*.
> 불변식 1 정정 — **요청 경로 LLM 0 → 해설만 예외**(저장본이 없을 때 그 자리에서 만들며 흘린다, FR-9). 나머지 칸은 그대로 저장값 읽기.

| FR | 내용 | 상태 |
|---|---|---|
| FR-9 | **해설 스트림** `GET /api/coach/explain/stream?symbol&mode`(SSE) — 지금 지문의 저장본이 있으면 `snapshot` 한 번, 없으면 생성하며 검사를 지난 문장부터 `sentence`(칸 · 글 · 출처) → `done`(저장) · 실패면 `fallback`(서버 문장). **같은 종목 · 모드 · 지문을 동시에 연 요청은 한 생성에 붙는다**(생성 1 · 구독 N) · 요청이 다 떠나도 생성은 끝까지 가서 저장(다음 사람 몫) · 하루 상한 · 로컬 CLI 게이트 · 검사기 그대로 · 하트비트 15초(`streaming-sse.md`). 배치는 미리 데우기로 남고 회차 겹침 해소(회차당 시간 상한 · 본 종목 먼저) | to-do |
| FR-10 | **시나리오 늘**(FR-5 개정) `GET /api/coach/scenario` — 로그인 사용자 누구나 · 지평 넷(1h · 4h · 1d · 5d) 늘. 칸마다 `source: model \| base_rate`: 모델이 시험을 넘은 칸은 `pUp`(**소유자만** — 아니면 그 칸도 base_rate), 아니면 **과거 실제 결과**(`FC-REQ-028` 기저율 — 지금 성립한 조건, 없으면 그 시장 평소): `{ condition, sample, sampleDays, upCount100, upRange, q10, q50, q90, usualUp100, differsFromUsual }` · 무효선 = 지금 가격 × (1 + q10). **내려가는 순서**: 지금 조건(유효 n ≥ 100) → 평소 → 한 단계 긴 지평(`fallbackFrom` 표시). 칸이 비는 응답 0 | **done 2026-11-13(1d · 5d)** — 1h · 4h 는 장중 기저율(순서 3) 전까지 하루 값(`longer`). 응답 정정은 Changelog |
| FR-11 | **원인 · 근거 · 결과 조립**(서버 계산 · LLM 0) — 종목 · 날마다 원인 후보 목록: `{ kind, headline, strength: likely \| possible \| none, evidence[], result }`. `kind`: disclosure(공시) · news(기사 사실) · sector(업종 전체) · market(시장 전체) · flow(수급) · pre_move(선반영) · none(확인된 소식 없음). **근거 하나 = 사실 + 숫자 + 비교 + 출처 · 시각**: 업종 지수 등락 · 같은 업종 n종목 중 m종목 상승 · 수급 금액과 20일 평균 대비 배수 · 소식 뒤 30분 등락 · 발표 전 5일 · 20일 등락 · 같은 종류 사건 과거 반응. `likely` 는 시각이 맞는 사건 + 근거 둘 이상일 때만, 하나면 `possible`, 없으면 `none`("확인된 소식이 없어요"). 용어 풀이(`gloss`)는 서버 사전. 기존 등락 분해(시장 · 업종 · 고유 몫, `SRV-REQ-051`)를 재료로 쓴다 — 새 계산은 배수 · 반응 창뿐 | **done 2026-11-13(있는 재료로)** — 공시 · 기사 사실 · 반응 창은 순서 2 · 3. 정정은 Changelog |
| FR-12 | **회사 사정** — 종목마다 `{ summary, earnings, today, sector, concern }` 네 칸 + 한 줄. 재료: 공시 추출 사실(FR-14 · `FC-REQ-026`) · 기사 추출 사실(FR-14) · 업종 폭(FR-11). 칸마다 출처 · 날짜. **좋은 점만 싣지 않는다** — `concern` 칸은 재료가 있으면 늘(연체율 · 부채 · 소송 · 실적 하향 같은 사실). 재료가 없으면 그 칸은 "확인된 공시가 아직 없어요"(빈 칸 0). 한 줄 요약은 LLM(해설과 같은 검사기) · 칸의 숫자는 서버 | to-do |
| FR-13 | **패널 한 번 응답** `GET /api/coach/panel?symbol` — 시나리오(FR-10) · 판단 한 줄 · 원인 근거 결과(FR-11) · 회사 사정(FR-12) · 성적 3종(기존) · 해설 저장본 유무를 한 응답으로. 칸마다 `status: ok \| fallback \| degraded` — 한 칸 실패가 패널을 비우지 않는다. 칸마다 `tier: now \| usual \| longer \| defect`(지금 조건 · 평소 · 한 단계 긴 지평 · "아직 n번뿐" — 어느 단을 썼나, `OPS-004` 가 센다) · 멈춘 값이면 `asOf`. 저장값 읽기만 · p95 300ms | **done 2026-11-13**(1d `feat/f017-v4-s1d-coach-panel`) |
| FR-14 | **사실 추출 배치**(LLM 읽기) — 공시 · 기사 본문에서 `{ who, what, amount, unit, compared_to, when, kind }` 사실만 뽑아 저장(`DB-REQ-043` FR-9). **문장은 저장 · 표시하지 않는다**(`ADR-009` 개정 2026-11-13) · 추출 사실마다 원문 주소 · 게시 시각 · 추출 시각(= `available_at`). 숫자는 원문 글자와 대조(없는 숫자를 뽑으면 버림) · 사건 종류는 사전(`news_kind_dict`) 우선, 못 맞추면 `other`. 기사 본문 원천은 포털 검색 API 를 거치지 않는 경로만 — `SRV-REQ-058`(언론사 RSS 원문 · 공시 원문 · 덮임률 ≥ 90%, `via ≠ portal` 행만 읽음) | to-do |
| FR-15 | **내 기준**(내 층) — 보유가 있으면 `{ myLine, gapToLine, heldDays }` · 내 선은 사용자가 정한 값(기존 계획 기록 재사용) · 서버 계산 · LLM 입력 0 · 매입가 숨김 설정을 따름. ~~**평단은 기본 응답에 싣지 않는다**(평단 강조 시 처분효과 +17% — 리서치) — 펼침 요청에만(Open Question)~~ **정정 2026-11-13**(사용자 2026-11-13 "1번 보여줘도 되지 않을까?") 평단 · 평가 손익도 기본 응답에 싣는다. 순서는 내 선까지 거리 → 평단 대비(강조는 선 쪽). 기존 매입가 숨김 설정(F009 FR-27)을 켠 사람에게는 싣지 않는다 | **done 2026-11-13**(1d) — 정정: `heldDays` 뺌(화면 소비 0 · 보유 일수는 거래 원장 날짜가 필요) |
| FR-16 | **해설 재료 · 검사 개정**(FR-3 개정) — 입력에 FR-11 원인 후보 · FR-12 회사 사정 · 시나리오 숫자 · 성적 · 빗나간 사례. 문장 순서 = 결론 → 원인 → 근거 → 결과 → 회사 사정 → 얼마나 믿을까(적중률 · 기준 · 틀렸던 때 — **서버가 판단 블록과 같은 값으로 쓴다**, `explanationPlain.ts`) → 조심할 점. 출처는 이름(`9:42 공시` · `수급 10:40`), 판단 자신은 출처 아님. 검사: 근거 없는 원인 문장 · 출처 없는 숫자 · 같은 말 반복 · 확신 · 명령형. 근거가 약한 원인은 "가능성이 있어요"(1인칭 불확실 표현 — 과신 감소) | **일부 done 2026-11-13** — 서버가 쓰는 3종 문장(얼마나 믿을까 · 틀렸던 때). LLM 재료 · 순서 · 검사 개정은 1f 와 같이 |
| FR-17 | **코인 원인 순서**(FR-11 코인판 — 코인엔 공시 · 실적이 없다) — ① 시장 몫("오늘 −4% 중 −3%p 는 비트코인 따라 · 나머지 −1%p" — `FC-REQ-028` FR-12) ② 거래소 경보 · 유의 사실(업비트 공식 페어 목록 `market_event` — 약관 확인 끝 2026-11-13 `FEATURE-017` Q6 · 값 그대로 · 출처 표시 · 공지 페이지 긁기 0) ③ 상장 나이(원화 마켓 연 날부터 며칠) ④ 예정된 공급 · 거시 시각(사실만, 방향 0) ⑤ 우리가 모은 소식("모은 원천에 최근 n시간 소식 0건" — 세상에 없음이 아님). 결과 줄 = 조건부 기저율 + 기준 + 표본 + 흔들림 범위 | **done 2026-11-13(①②③⑤)** — ④ 예정된 공급 · 거시 시각은 원천 없음(순서 2) |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-12 | 확인 2회차 결함 — 국내 제목 신선도를 매분 수집 행만으로(`69f37627`, 백필이 덮고 400일 표를 훑던 자리) |
| 2026-11-12 | **FR-6 done**(단계 6 · `feat/f017-s6-measure-tags`) — 국내 제목 1년 백필(`BackfillKrNewsTitles` · KIS 한도 맨 뒤 `backfill` · 장중 2쪽/분 · 밖 30쪽/분) · 보관 400일 · `TagNews`(태그는 덧붙임 — 뷰가 없거나 실패면 행만) · `PrismaNewsTagReader`(사전 · 서술 10분 캐시 · 선반영은 행마다 게시 전 마지막 봉) · 국내 소식 · 코인 종목 뉴스 · 왜 움직였나 사실. 종목 뉴스 같은 시각 순서 고정(id 둘째 정렬 — 경로 전환 대조에서 발견) |
| 2026-11-12 | `GET /api/coach/forecast`(주간 변동 범위) 서버 · BFF 경로 삭제 — 화면 소비처 0(F017 v2 단계 5 가 시나리오 카드로 교체) · 코치 도구 · 해설 읽기 0 확인. 서버 `GetSymbolForecast` · `toForecastHorizon` · 리더 `cards` · `recentCloses`, BFF `getForecast` · `forecast.viewmodel` · 라우트. 예측 쪽 생성은 그대로. 서버 test 1238 → 1223 · BFF 456 → 447(지운 기능의 테스트만) |
| 2026-11-09 | 신규(to-do) — `FEATURE-017` · `ADR-010`(제안) |
| 2026-11-10 밤(구현) | FR-1 · 2 done `d6105374` · Swagger 정정. 실측 2026-11-10(코인 거래대금 상위 100 + 국내 유니버스 50, BFF 150요청): 판단 보임 300/300 모드(전 코인 단타 33 · 장기 0 · 국내 단타 0 · 국내 장기 38/57) · 3종 다 있음 코인 단타 90 · 국내 장기 50(21 은 과거 검산으로 채움) · 3종 결함 160(코인 장기 100 · 국내 단타 50 · 코인 단타 10 — 코인 과거 검산 `FC-REQ-028` FR-5 · 국내 단타 원장 `SRV-REQ-040` FR-63 이 채운다) · BFF p50 33ms · p95 94ms. 판단 상세 504 오늘 10시 이후 6건(약 710요청 · 1건은 재시작 직후 첫 연결 — 프로세스 첫 요청 약 170ms 연결 열기) — FR-0 잔여, 관찰 |
| 2026-11-10 밤 | **v2** — FR-1 3종 늘(과거 검산으로 채움) · FR-2 보류 사실 → 꼬리표 `caveats[]`(결함 셋 포함) · FR-4 쉬운 한 줄 `summary` · `below_min` · FR-7 등급 · FR-8 3종 결함 세기 신규 · 불변식 4 · 5. 1a 도메인 진행(미커밋) |
| 2026-11-10 | to-do → in-progress. **개정 — 범위 "잘 사고 잘 팔기"**: FR-0 결함 넷 done(`001aac19` · `7e0e9174` · `432f5d38` · `f73bbc9f`) · FR-3 해설 = 스냅샷 배치 + 4단 · FR-4 점검 · FR-5 시나리오(소유자) · FR-6 측정 태그 신규. 뺀 것: 짧게 먼저 · 물어보기 · 채점 지표 · 엔진 v3. 불변식 셋 |
| 2026-11-10 밤(1b) | 3종 채움 완성 — 코인 · 국내 단타 과거 검산(`signal-skill@1` `03771c6f` → `f38ca6ae`) · 국내 단타 라이브 원장(`326a0553`). 실측(서버 150요청 · 300모드): 3종 결함 **160 → 6**(남은 6 = 코인 장기 피하기, 과거 검산 판단 날 8 < 10) · p95 40ms |
| 2026-11-11 | FR-8 done — `attachJudgmentTrack` 한 곳에서 결함 꼬리표가 붙은 종목 수(시장 · 모드, 같은 종목 한 번 · 나중 응답이 지우면 빠짐) · 10분 줄 `🧩 3종 결함 10분` · 상태 점검(`OPS-003`)이 읽음. 첫 줄 10:40 합 0(25종목 × 두 모드) |
| 2026-11-11 | **단계 2**(`feat/f017-s2-checks-plain-line`) FR-4 done `dd9a2782` — `GET /api/coach/check` · 원장 한 줄. 실데이터 대조 결함 하나(한 달 묵은 밀려난 종목 시세를 어제 종가 문턱과 비교해 '상한가 근처') → 규칙으로 고침(시세 시각 > 기준 봉일 때만 `next`, 아니면 `closed`). 코인 요약 기간은 '4시간 뒤'가 아니라 '하루 동안' — 일봉 기저율이라 지평 1일(4시간은 단계 5 단타 확률) |
| 2026-11-11 | **단계 3**(`feat/f017-s3-explain-always`) FR-3 done — `explanation_snapshot` · 배치 `GenerateExplanationSnapshots`(10분 :05) · 읽기 `GET /api/ai-coach/explanation`(4단) · 옛 즉석 경로 둘 삭제. 실데이터: 첫 회차 후보 106(추적 53 × 2) · 생성 12 · 실패 0 · 로컬 Claude 약 15초/벌 · 읽기 27~115ms. 확인 중 결함 둘 고침 — 검사가 전부 버린 생성이 `llm_checked` 로 저장되던 것(남은 LLM 문장 ≥ 1 일 때만) · "판단 뒤 24시간"을 시세로 인용하던 것(옮긴 사실 글 안 숫자는 다시 맞추지 않음) |
| 2026-11-11 | **단계 4**(`feat/f017-s4-grade`) — FR-7 done(`a584ea21`). 지금 등급은 네 칸 다 참고(`no_candidate`) — 판단 화면에 이유 · 유효 표본 n/620 |
| 2026-11-11 | **단계 5**(`feat/f017-s5-short-direction`) FR-5 done `74289a7a` — `GET /api/coach/scenario`(소유자만 · 지평 늘 셋 · 막힘 이유 하나 · 막혀도 시험 성적). 정정: 응답 `range{lowPct,midPct,highPct}` · `track.alwaysUpHits`(같은 확신 행 늘 오른다). 언어 가드 테스트가 면책 문구 '보장'을 잡아 '자주 빗나가며'로 |
| 2026-11-12 | **단계 4b** — 등급용 후보 규칙 `mode-decision@3`(후보 문턱 70 → 60) 사전등록 `94122c60` · 정정 `e1fff7c5`(70 은 @2 가 일부러 남긴 것) → 표본 밖 관문 **hold**: 국내 단타 후보 비용 뒤 −0.203% [−0.280, −0.127] · 비용 전 +0.02%(리포트 `requirements/reports/backtests/mode-decision-3-gate-2026-11-12.md`). 라이브 규칙 · 코드 변경 0 — FR-7 등급은 그대로 참고(`no_candidate`). 후보는 문턱이 아니라 새 신호가 있어야 나온다 |
| 2026-11-12 | F016 단계 D(짝 — 이 REQ 가 머리 주인인 파일): 해설 배치 `GenerateExplanationSnapshots` 가 LLM 상한 끝 30회를 남긴다(오늘 등락 한 줄 몫) — 해설 회차 상한 · 지문 규칙 그대로 |
| 2026-11-12 | 서버 S3b 짝(`MONEY-S3b-identity-accounts`): 워커 `investment-insight.worker.ts`(머리 주인) — 준수 판정 · 월간 복기 · 리밸런스 대상이 `prisma.user.findMany` → `listCoachedUsers`. 판정 · 해설 몫 변경 0 |
| 2026-11-13 | **v4 한 장 패널**(전 영역 계획 `requirements/specs/in-progress/F017-v4-one-panel-global-plan.md`) — FR-9~16 신규(to-do): 해설 스트림 · 시나리오 늘(FR-5 개정) · 원인 근거 결과 조립 · 회사 사정 · 패널 한 번 응답 · 사실 추출 배치 · 내 기준 · 해설 재료 개정(FR-3 개정). 불변식 1 정정(해설만 요청 경로 생성) |
| 2026-11-13 | FR-15 정정 — 평단 기본으로 보임(사용자) · 매입가 숨김 설정은 그대로 따름 |
| 2026-11-13 | FR-17 코인 원인 순서(시장 몫 · 거래소 경보 · 상장 나이 · 예정 사실 · 모은 소식) — 리서치 F §7(d) |
| 2026-11-13 | FR-13 칸마다 `tier` · `asOf` — `OPS-004` 칸 채움 점검의 전제 |
| 2026-11-13 | FR-14 본문 원천 = `SRV-REQ-058`(Q6 닫음) |
| 2026-11-13 | **F017 v4 순서 1a — 시나리오 늘**(`feat/f017-v4-s1-scenario-always`) FR-10 **done(1d · 5d)** — `GET /api/coach/scenario` 로그인 누구나 · 지평 넷 · 칸마다 `source` · `tier` · `fallbackFrom` · 정책 `scenarioBaseRate.ts`(지금 조건 → 평소 → 한 단계 긴 지평 → 결함) · 소유자 판정은 모델 칸 읽기만. **정정**: 응답은 `model`(모델 칸 · 소유자) · `baseRate`(과거 실제 결과) 두 묶음 · 숫자는 **비용 전**(가격이 실제로 움직인 분포 `hold_*` — 점검 한 줄은 비용 뒤 그대로) · Wilson 범위는 같은 유효 n 으로 서버가 · 틀리는 선은 원 단위. 1h · 4h 는 장중 기저율(`FC-REQ-028` FR-7 · 순서 3) 전까지 하루 값(`longer`) |
| 2026-11-13 | **F017 v4 순서 1b — 원인 → 근거 → 결과**(`feat/f017-v4-s1-scenario-always`) FR-11 · FR-17 **done(있는 재료로)** — `market/domain/MoveCause.ts` `assembleMoveCauses`(서버 계산 · LLM 0) · 재료 리더 `PrismaMoveEvidenceReader`(소식 뒤 5분봉 30분 · 같은 업종 폭 · 프로그램 평소 · 첫 일봉) · `GET …/why-moved` 응답에 `cause`. **정정**: ① 원인 후보 소식은 공시 · 사건 종류가 맞은 기사만(종류를 모르는 시황 묶음 제목은 결과이지 원인이 아니다) · 종목 몫은 소식 자체의 근거가 받칠 때만 같이 셈 ② 평소 범위 안의 날(σ 의 절반 · 바닥 0.5%)은 원인을 찾지 않음 — 거래소 표시는 예외(사실) ③ 원인 머리말에서 한 점 목표가를 뺌(공통 수용 기준 4) ④ 몫 · 오늘 등락은 둘째 자리(분해 표와 같은 모양) ⑤ 단계 이름은 문장에 넣지 않음(화면이 붙인다) ⑥ 코인 상장 나이는 첫 일봉(`listed_at` 은 우리가 처음 본 날). 공시 · 기사 사실 · 반응 창은 순서 2 · 3 |
| 2026-11-13 | **F017 v4 순서 1c — 3종 문장**(`feat/f017-v4-s1-scenario-always`) FR-16 **일부(서버가 쓰는 몫)** — 해설 응답 맨 뒤에 칸 둘 `track`(얼마나 믿을까: 적중률 · 표본 · 판단 기간 · '늘 같은 쪽' 기준) · `miss`(틀렸던 때 최대 둘)을 **네 단 모두** 늘 붙인다(`explanationPlain.ts` `plainTrustSentences` · LLM 0). 값은 판단 블록과 같은 함수(`attachJudgmentTrack`)가 만든 `trackRecord` · `failureCases` · 반올림도 판단 블록과 같다. 저장하지 않고 읽을 때 붙임(성적이 바뀌어도 해설을 다시 만들 필요 없음) · 옛 저장본에 같은 칸이 있으면 지금 값 한 벌만. **범위 정정**: FR-16 의 나머지(LLM 재료에 원인 · 회사 사정 · 시나리오 · 문장 순서 · 검사 개정)는 생성 경로를 다시 쓰는 1f(스트림)와 같이 — 지금 바꾸면 프롬프트 버전이 바뀌어 전 종목 해설을 두 번 다시 만든다. `explanationPlain.ts` 의 결론 · 관측 문장(쓰는 곳 0)은 지움 |
| 2026-11-13 | **F017 v4 순서 1d — 패널 한 번 응답**(`feat/f017-v4-s1d-coach-panel`) FR-13 · FR-15 **done** — `GET /api/coach/panel`(로그인 누구나) · `GetCoachPanel` 은 칸별 경로와 **같은 유스케이스 인스턴스**(시나리오 · 점검 · 판단 · 해설 · 원인)를 한 번에 조립 · 새 계산 0. 칸마다 단 규칙은 도메인 한 곳 `coachPanel.ts`(`now` · `usual` · `longer` · `defect` → `ok` · `fallback` · `degraded`) · 칸 표 `cells` 11줄(`OPS-004` 가 센다) · 기간 탭 → 모드 `horizonMode`(1h · 4h 단타 · 1d · 5d 장기). 한 칸 실패 = 그 칸만 결함(응답 200). 원인은 market 공개 API `whyMovedCard(…, { cause: true })` ACL `MoveCauseAdapter`(③ 배치 기본값 그대로 false). 회사 사정은 재료가 순서 2 라 늘 `defect` + `source_not_collected`. 내 기준 = 보유 · 최근 매수 계획의 손절가(없으면 목표가) · 매입가 숨김이면 평단 · 평가 손익 null · 보유를 못 읽으면 `degraded`(보유 없음으로 접지 않음). **성능 정정**: 해설 두 모드가 판단 재료를 각자 읽어 동시 4 p95 371ms → `GetSymbolExplanation.executeModes`(모드와 무관한 재료 한 번 · `loadExplanationBase`) 로 140ms. 실측 157종목(서버 · 동시 4) 실패 0 · 순차 p95 68ms. 재기동 직후 · 맥 load 172 때 풀 대기 10초로 칸 결함(500 아님)을 실제로 봤다 |
