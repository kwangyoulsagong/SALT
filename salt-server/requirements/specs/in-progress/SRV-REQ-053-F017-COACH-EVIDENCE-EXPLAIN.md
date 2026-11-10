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

## FR

| FR | 내용 | 단계 | 상태 |
|---|---|---|---|
| FR-0 | **결함(2026-11-10 전 종목 실측)** ① 국내 호가 — KIS 우선순위 `viewer`(폴링 앞) + 받아 둔 값을 바로 주고 뒤에서 새로 받기 · 처음 보는 종목만 2초 상한 → `pending`(`001aac19`, 1.5~22초 → 15~190ms) ② 코인 상세 대시보드 15초 캐시 · 지나면 받아 둔 값 + 뒤 계산(`7e0e9174`, 1.9초 → 37~157ms) ③ 국내 시세 표 = 유니버스만(`432f5d38`, 멈춘 7행 → 0) ④ 국내 소식 오늘이 비면 최근 7일 `scope: recent`(`f73bbc9f`, 빈 칸 11/57 → 표본 3종목 채움) | 0 | **done** |
| FR-1 | **관측 근거** — 모드 판단 응답에 `observations[]`: `{ item, value, lower, upper, distance, points, missing }`(문턱은 규칙 버전 상수). 같은 판정의 `components` 와 같은 값(원장 대조 테스트). `judgmentEvidence` = 문장 ∪ 관측(결측 아님) — 관측 ≥ 1 이면 근거(`ADR-010`) | 1 | to-do |
| FR-2 | **보류 사실** — `reasons_missing` 삭제. 남은 사유마다 `blockedFacts`: 재료 멈춤 `{ item, lastAt }` · 이력 `{ have, need }` · 표본 `{ sample, min }` · 투자유의 `{ since }` · 열지 않은 모드 `{ assetClass, mode }` · 실패사례 0 `{ sample }` | 1 | to-do |
| FR-3 | **해설 늘 보이게** — ① 사실표 조립(관측 · 성적 · 실패 사례 · 같은 날 사실(`FEATURE-016` ②) · 점검 · 태그 — id 붙임) ② **스냅샷 배치**: 종목 지문(판정 · 관측 구간 · 확률 구간 · 태그 · 규칙 · 프롬프트 · 검증기 버전 해시)이 바뀐 종목만 생성(로컬 → 대체 공급자 → 템플릿) → 검증기(숫자 · 인용 id · 금지어 · 명령형 — `FEATURE-008` FR-49 · `ADR-009` 표 한 벌) → `explanation_snapshot` 저장. 실패한 생성은 쓰지 않고 이전 성공본 유지 ③ **읽기 4단**: 최신 AI → 이전 AI + `generatedAt` → 사실표 템플릿(`tier: template`, AI 표시 없음) → "특이 소식 없음" + 판정 근거(`tier: none`) — 빈 칸 0 | 1 | to-do |
| FR-4 | **사기 전 · 팔기 전 점검** `GET /api/coach/check?symbol&side` — 사기 전: 지금 상태가 맞는 사전등록 조건(`v_base_rate` — `FC-REQ-028` FR-2)의 분포 `{ condition, horizon, sample, upRate, mean, q10, invalidationGap, chase, preMove }`. 팔기 전: 보유(포트폴리오 공개 API — 서버 계산) 확정 손익 + 같은 조건 보유 연장 분포 `{ realizedPct, hold: { sample, q10, q50, q90 } }`. 조건에 맞는 행이 없으면 `status: no_condition`(지어내지 않음). 점검마다 원장에 한 줄(나중 채점) | 2 | to-do |
| FR-5 | **시나리오** `GET /api/coach/scenario?symbol` — `v_short_horizon_card`(`FC-REQ-028` FR-1) 1h · 4h · 1d `{ renderable, blockedReason, pUp, q10, q50, q90, invalidation, track{ calls, hits, baseline, misses[] } }`. 시험 통과 표지가 없는 모델 · 지난 예측(기준 시각 + 수평선 지남)은 `renderable: false` + 사유. **소유자 판정**(`ADR-003` — `ownerGateScope.test.ts` 허용표에 이 경로 추가) | 3 | to-do |
| FR-6 | **측정 태그** — 국내 소식(`GetKrStockNews`) · 코인 뉴스 · 일정 응답 행에 `eventKind` · `reaction{ days, sample, upRate, mean }` · `preMove5d` · `label`(`up_usually` · `down_usually` · `mixed` — 표본 · 엇갈림 문턱은 서버 설정). `v_news_reaction`(`FC-REQ-028` FR-3) 읽기만. 호재 · 악재 단어 0 | 4 | to-do |

## Acceptance Criteria

- [x] FR-0 — 호가 경계 표 테스트(받아 둔 값 · 처음 보는 종목 상한 · 뒤 갱신 실패 → stale · 30초) · 대시보드 테스트 4 · 국내 표 유니버스 · 소식 recent 테스트 · 실측 전후 수치(커밋 본문)
- [ ] 관측 = 원장 `components`(경계 표: 결측 · 문턱 위 · 아래 · 같음) · `reasons_missing` 0 · 보류 사유마다 사실 칸
- [ ] 해설 4단 경계 표(최신 · 이전 · 템플릿 · 없음) · 검증기 거절 표 · 실패 생성은 저장 0 · 요청 경로 LLM 0(테스트로 셈)
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
| 2026-11-10 | to-do → in-progress. **개정 — 범위 "잘 사고 잘 팔기"**: FR-0 결함 넷 done(`001aac19` · `7e0e9174` · `432f5d38` · `f73bbc9f`) · FR-3 해설 = 스냅샷 배치 + 4단 · FR-4 점검 · FR-5 시나리오(소유자) · FR-6 측정 태그 신규. 뺀 것: 짧게 먼저 · 물어보기 · 채점 지표 · 엔진 v3. 불변식 셋 |
