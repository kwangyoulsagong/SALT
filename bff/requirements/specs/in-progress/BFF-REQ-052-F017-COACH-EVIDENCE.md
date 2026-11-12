---
id: BFF-REQ-052
feature: F017
area: bff
kind: API
title: "AI 코치 — 결함(504 → 마지막 판단 · 호가 pending · 소식 scope) · 판단 관측 · 보류 · 해설 4단 · 시나리오 · 점검 · 측정 태그 뷰모델"
priority: high
created: 2026-11-09
source: pm/requirements/specs/in-progress/FEATURE-017-ai-coach-best-case.md
---

## Summary

`FEATURE-017` 화면 계약. 숫자 계산 0 · 문장 0(사유 코드 · 사실 칸만 — 문장은 화면 i18n). 모르는 값 · 사유 · 단은 버린다.

> **v2 (2026-11-10 밤, `FEATURE-017` v2 · `ADR-010` v2)** — 모드 뷰모델은 더 이상 `renderable` 판별 union 이 아니다: 판정 · 관측 · 성적 · 빗나간 사례가 늘 있고 `caveats[]` · `tier` 가 붙는다(옛 `BFF-REQ-024` FR-31 뒤집힘).
> FR-1 · 3 을 그 자리에서 고쳤다. BFF 는 여전히 숫자 계산 · 판정 0 — 막지도 열지도 않고 모양만 지킨다.
>
> **2026-11-10 개정 — 범위 "잘 사고 잘 팔기"**. 11-09 FR-4(물어보기 SSE)는 뺐다. FR-0(결함) · FR-3~5 새로. 번호 다시 매김.

## FR

| FR | 내용 | 단계 | 상태 |
|---|---|---|---|
| FR-0 | **결함(2026-11-10)** ① `ai-coach/detail` 서버 판단이 시간을 넘기면 같은 **토큰 해시** · 종목 · 모드의 마지막 판단(10분 안)을 `staleSince` 와 함께(`8baf8109` — 로그 시간 초과 157줄, 검증 안 한 사용자 id 키는 위조 토큰이 남의 판단을 읽어 금지) ② 국내 호가 뷰모델 `pending`(`001aac19`) ③ 국내 소식 뷰모델 `scope: today|recent`(`f73bbc9f`) | 0 | **done** |
| FR-1 | `GET /api/app/ai-coach/detail` 모드 뷰모델에 `observations[]` · ~~보류면 `blockedReason` + `blockedFacts`~~ **v2**: `judgment` · `trackRecord{ sampleOrigin, liveSample, … }` · `failureCases` 늘 + `caveats[]`(서버 값 그대로 — 모르는 `reason` 은 버리지 않고 `unknown` 꼬리표로 셈만) · `tier`(모르는 값이면 `reference`). ~~판단 · 성적 · 사례 중 하나라도 비면 그 모드는 `unavailable`~~ **정정(구현 11-10)**: 그렇게 하면 판단이 다시 숨는다 — 3종 결함은 서버 결함 꼬리표를 단 채 **보인다**(실패사례가 빈 배열이어도). `null`(`unavailable`)은 모양이 깨졌을 때뿐: 꼬리표 배열 없음 · 판단 · `scoreNote` · 성적 없음 · 실패사례가 비었는데 결함 꼬리표 없음. 투자유의 표시가 있는데 꼬리표가 없으면 더하는 쪽으로만. 등급(`tier`)은 단계 4 | 1 | **done**(`f843104e` · 등급 `7796338b` 2026-11-11 — `toTier`: 모르는 값 · 옛 서버 · 출처 어긋남 → 참고 `not_computed`) |
| FR-2 | `GET /api/app/ai-coach/explanation?symbol&mode` → `{ symbol, mode, tier: latest|previous|template|none, aiGenerated, provider, generatedAt, sentences[{ section, text, citations[{ id, label, at, url }] }], disclaimer }` — 서버 4단 그대로 · 캐시 0 · 300ms · GET 재시도 1 · 모양 깨짐 502(빈 문장 · 인용 없는 문장도 깨짐) · 인용 주소 `http(s)` 만. 옛 `POST /explain` · `/explain/stream`(즉석 · SSE 중계 · 동시 상한)은 지움 | 3 | **done 2026-11-11** |
| FR-3 | `GET /api/app/ai-coach/check?symbol&side=buy|sell` — 서버 점검 그대로(조건 · 표본 · 분포 · 무효선 거리 · 보유 연장 분포). `no_condition` · 보유 없음(`side=sell`) 상태. **v2**: `summary`(서버 문장 그대로 — BFF 가 문장 · 숫자를 고치지 않음) · `status: ok | below_min | no_condition` · `upRange` · `sampleDays` 를 옮긴다. 화면 맨 위 칸이라 예산 p95 200ms | 2 | **done 2026-11-11** `aa3c1393` — 실호출 15~120ms · 표본 미달에 비율이 실려 오면 막음 · 모양 깨짐 502 |
| FR-4 | `GET /api/app/ai-coach/scenario?symbol` — 1h · 4h · 1d `{ renderable, blockedReason, pUp, q10, q50, q90, invalidation, track }`. 비소유자 404 통과(자리 0) | 3 | **done 2026-11-11**(단계 5 `33d1c061`) — 서비스는 전망과 같은 자리(`app-forecast.service`: 4xx 그대로 · 5xx 200 `unavailable`). 뷰모델은 **막을 수만** — 열린 지평에 확률 · 범위 · 무효선 · 성적 · 빗나간 사례 중 하나라도 없으면 그 지평만 `contract_incomplete`. 화면 재료 `upOutOf100` · `hitRate` · `alwaysUpRate`. 칸 이름은 서버 정정 그대로(`range{lowPct,…}` · `track.alwaysUpHits`) |
| FR-5 | 국내 · 코인 소식 뷰모델 행에 `eventKind` · `reaction` · `preMove5d` · `label` — 모르는 `label` 은 태그 없이 행만 | 4 | **done 2026-11-12** `55fba89c` · `95f9a35e` — `news-tag.viewmodel`(순수 매퍼 한 벌 — 국내 소식 · 코인 뉴스 · 왜 움직였나 사실). 라벨 넷(`few` 더함) · 깨진 모양이면 태그 null. 코인 뉴스 upstream `/news?symbol` → `/market-intelligence/:symbol/news`(같은 기사 · 5종목 id 순서 대조 — `viewCount` 는 화면이 안 써 빠짐) |

## Acceptance Criteria

- [x] FR-0 — 마지막 판단 테스트 3(새 판단 null · 실패면 마지막 + 시각 · 다른 토큰/종목/모드 504 · 10분 넘으면 504) · 키 스냅샷 `staleSince` · 전체 444 통과
- [ ] 원 응답 → 뷰모델 계약 테스트(관측 · 보류 · 4단 · 점검 · 시나리오 · 태그 · 모르는 값 버림)
- [ ] `ai-coach/*` p95 ≤ 400ms(국내 · 코인 측정표) · BFF 숫자 계산 0(grep 테스트)

## 계약 영향

- 서버 `SRV-REQ-053` · FE `FE-REQ-064` · 기존 `BFF-REQ-023`(코치 경로) · `BFF-REQ-039` · `BFF-REQ-040`(국내 호가) · `BFF-REQ-051`(국내 소식)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-12 | **FR-5 done**(단계 6) — 측정 태그 뷰모델 · 코인 뉴스 upstream 전환. 테스트 453 |
| 2026-11-12 | `GET /api/coach/forecast`(주간 변동 범위) 서버 · BFF 경로 삭제 — 화면 소비처 0(F017 v2 단계 5 가 시나리오 카드로 교체) · 코치 도구 · 해설 읽기 0 확인. 서버 `GetSymbolForecast` · `toForecastHorizon` · 리더 `cards` · `recentCloses`, BFF `getForecast` · `forecast.viewmodel` · 라우트. 예측 쪽 생성은 그대로. 서버 test 1238 → 1223 · BFF 456 → 447(지운 기능의 테스트만) |
| 2026-11-09 | 신규(to-do) |
| 2026-11-10 밤(구현) | FR-1 done `f843104e` — 판별 union 폐지 · 3종 결함은 보이고 깨진 모양만 `null`(문장 정정) · 테스트 443/443. 실측 2026-11-10(코인 거래대금 상위 100 + 국내 유니버스 50, BFF 150요청): 판단 보임 300/300 모드(전 코인 단타 33 · 장기 0 · 국내 단타 0 · 국내 장기 38/57) · 3종 다 있음 코인 단타 90 · 국내 장기 50(21 은 과거 검산으로 채움) · 3종 결함 160(코인 장기 100 · 국내 단타 50 · 코인 단타 10 — 코인 과거 검산 `FC-REQ-028` FR-5 · 국내 단타 원장 `SRV-REQ-040` FR-63 이 채운다) · BFF p50 33ms · p95 94ms |
| 2026-11-10 밤 | **v2** — FR-1 모드 뷰모델 판별 union 폐지 · 3종 늘 · `caveats[]` · `tier` · 3종 결함은 `unavailable` + 셈 · FR-3 `summary` · `below_min`(`FEATURE-017` v2) |
| 2026-11-10 | to-do → in-progress. **개정** — FR-0 결함 셋 done(`8baf8109` · `001aac19` · `f73bbc9f`) · FR-2 해설 4단 · FR-3 점검 · FR-4 시나리오 · FR-5 태그. 물어보기 뺌 |
| 2026-11-11 | **단계 2**(`feat/f017-s2-checks-plain-line`) FR-3 done `aa3c1393` — 서버 문장 그대로 · `dots`(100칸 중 칠할 칸 = 비율 반올림 — 표시 변환, 새 판정 0) · 예산 200ms |
| 2026-11-11 | **단계 3**(`feat/f017-s3-explain-always`) FR-2 done — 해설 뷰모델 `explanation.viewmodel.ts` · 경로 하나 · 즉석 해설 · 스트림 중계 · `client-kind` · `concurrency` 유틸 삭제(쓰는 곳 0) |
| 2026-11-11 | **단계 4**(`feat/f017-s4-grade`) — FR-1 등급 칸 done(`7796338b`): `tier` · `tierBasis` 를 서버 값 그대로, 검증됨은 출처 라이브 · 주의는 출처 있음일 때만(서버와 같은 불변식) |
| 2026-11-11 | **단계 5**(`feat/f017-s5-short-direction`) FR-4 done `33d1c061` — `/api/app/ai-coach/scenario` · 뷰모델 막을 수만(`contract_incomplete`) · 4xx 그대로 · 5xx unavailable |
| 2026-11-11 | **단계 5 정정**(`d2237fb3`) — 성적에 `alwaysNotUpRate`(늘 안 오른다 = 확신 행 − 늘 오른다 맞힘). @2 진단: 확신 99% 가 '안 오름' 쪽이라 늘 오른다만으론 기준이 약했다. 막힌 카드에도 나가는 줄 |
