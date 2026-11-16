---
id: FC-REQ-022
feature: F008
area: forecast
kind: DATA
title: "온톨로지 O1 · O2 — entity · relation · fact(시점 고정) + 기존 데이터 적재 + 엔티티 연결 품질"
priority: high
status: in-progress
created: 2026-10-30
source: requirements/decisions/ADR-007-forecast-ontology-schema-owner.md
---

## Summary

FEATURE-008 FR-25(Draft). `ontology/__init__.py` 0줄. 뉴스 · 일정 · 신호 · 종목 마스터가 흩어져 있어 "이 뉴스는 어느 종목에 관한 것인가"를 매번 새로 짠다.
**새 수집 없이** 이미 있는 데이터로 첫 그래프를 만든다. 누수 규칙(`time-and-leakage.md`)이 그대로 적용된다.

## FR — O1 테이블 · 적재

| FR | 내용 | FEATURE-008 |
|---|---|---|
| FR-1 | `forecast.entity`(id · kind · canonical_name · external_ids jsonb · created_at). kind: asset · company · person · institution · wallet · event · document · sector · policy | FR-25 |
| FR-2 | `forecast.relation`(subject · predicate · object · valid_from · valid_to · observed_at · ingested_at · source_url · source_kind · confidence). predicate: issued · listed_as · holds · traded · mentions · affects · belongs_to · regulates | FR-25 |
| FR-3 | `forecast.fact`(entity · attribute · value_num · value_text · unit · valid_from · valid_to · observed_at · ingested_at · source_url) | FR-25 |
| FR-4 | 계약 뷰 `v_entity_asof(as_of)` — `available_at <= as_of` 만(**2026-10-30 정정** — 처음엔 `ingested_at`, 이력 참고). `v_neighbors(entity_id, depth≤3, as_of)` — 재귀 CTE | FR-25 |
| FR-5 | 적재 잡 `ontology_build` — 종목 마스터 · 업비트 마켓 → asset · company · listed_as · belongs_to sector / `news_item` · `news_score` → document · mentions · 감성 fact / `scheduled_event` · `signal_event` → event · affects / `event_reaction` → 반응 fact | FR-25 |
| FR-6 | 멱등 — 같은 원천 행 재적재 시 중복 0(원천 키를 external_ids 에) | — |
| FR-7 | DDL — 지금은 `salt-server/prisma/migrations`(ADR-004 §5), O5 이후 `salt-forecast` 안(`FC-REQ-025`) | — |

## FR — O2 엔티티 연결 품질

| FR | 내용 |
|---|---|
| FR-10 | 뉴스 → 종목 매칭(종목명 · 티커 · 별칭) 표본 200건 수기 라벨, 정밀도 · 재현율 기록 |
| FR-11 | 기준(정밀도 0.9 · 재현율 0.7 — 표본 분포를 본 뒤 확정) 미달이면 `mentions` 를 에이전트 도구에 쓰지 않는다(`FC-REQ-023` 게이트) |
| FR-12 | 동명 회사 · 영문/한글 이름 충돌 목록을 리포트로 |

## Acceptance Criteria

- [ ] 누수 테스트 — as-of 질의가 미래 `ingested_at` 행을 돌려주지 않는다(무작위 시점 1,000회)
- [ ] 3홉 질의 p95 200ms 이하(로컬 데이터)
- [ ] 재적재 2회 후 행 수 동일
- [ ] O2 표본 라벨 · 정밀도 · 재현율 리포트

## 계약 영향

- DB DDL(현재 `salt-server/prisma`) — 뷰 계약 신규라 서버 소비자 없음

## FR — v4 재설계: 사실 → 근거 → 원인 후보 → 결과 (2026-11-13 · 전 영역 계획 `requirements/specs/in-progress/F017-v4-one-panel-global-plan.md`)

> 사용자 2026-11-13: *"우리 온톨로지가 아직 설계가 안 되어 있어서 뉴스 그리고 공시 환율 이런 것들 RSI"* · *"사실 근거 원인"* · *"다 설명할 수 있잖아 우린 다 데이터가 있는데"*.
> 위 O1(entity · relation · fact)은 그대로 바닥이다. 목적을 "에이전트가 조회하는 그래프"에서 **"원인 · 근거 · 결과를 잇는 틀"**로 바꾼다. `FEATURE-017` 범위 밖(11-10) → **범위 안**.

| FR | 내용 | 상태 |
|---|---|---|
| FR-13 | **네 층** ① 사실(`fact` — 출처 · 관측 시각 · `available_at`: 공시 · 기사 추출 사실 · 지표값 · 수급 · 환율 · 금리) ② 근거(`evidence` — 사실 + 비교: 평소 대비 배수 · 업종 대비 · 반응 창) ③ 원인 후보(`cause_candidate` — 사건 + 근거 묶음 + `strength`) ④ 결과(`outcome` — 실제 등락 · 그 뒤 채점). ③ · ④ 는 서버 조립 결과의 사본(주인 `SRV-REQ-053` FR-11) | **done 2026-11-16**(순서 5b) — ① `fact`(등락 · 몫 — 원인 스냅샷) ② `evidence` ③ `cause_candidate` ④ `outcome`(시장 대비 1 · 5봉). 공시 · 기사 사실 · 환율 · 금리를 ① 에 싣는 것은 FR-16 |
| FR-14 | **연결 셋** 사건 ↔ 종목 ↔ 업종(`affects` · `belongs_to` — 업종 소식을 종목에) · 사건 ↔ 반응 창(`FC-REQ-028` FR-8) · 원인 후보 ↔ 채점 | **done 2026-11-16** — 사건 `affects` 종목 · 종목 `belongs_to` 업종(마스터 · 바뀌면 옛 관계 닫음) · 후보 ↔ 결과(같은 종목 · 거래일). 반응 창 연결은 FR-16 과 함께 |
| FR-15 | **원인 설명 채점** — "가장 유력"이라 한 원인 종류별로 뒤의 등락이 과거 같은 종류와 같은 방향이었나 · 기준(업종 몫만으로 설명) 대비 | **in-progress 2026-11-16** — 사전등록 `cause-explain@1`(`898eec54`, 결과 전) · 매일 `cause_explain` · 전진만(판정 2027-01-15 · 02-14 · 03-16) |
| FR-16 | 새 원천 — 공시(`FC-REQ-026`) · 기사 추출 사실 · 환율 · 금리 · 지수 값(`series_point` 확장). 원천마다 `available_at` 정의를 `security-sources.md` 표에 | **done 2026-11-16(5b-2)** — 공시(처음 본 시각) · 기사 추출 사실(서버 추출 시각) · 환율 · 금리 · 지수 · 공포탐욕 · 스테이블코인 · 온체인(시계열 available_at — 거래소 입출금은 판정 금지라 뺌). 코인 종목 고빈도 시계열(펀딩비 등 240만)은 복제하지 않음. 국내 투자자 수급 표는 0행 · 프로그램 장중은 틱이라 뺌 |

## FR — 상태(2026-11-16 순서 5)

| FR | 상태 |
|---|---|
| FR-1~3 | **done** — 표 셋 + `merged_into` · CHECK 닫힌 목록. 마이그레이션 `20261116200100_forecast_ontology_cause` |
| FR-4 | **done(정정)** — 뷰는 인자를 못 받아 **함수** `forecast.f_fact_asof(as_of, entity?)` · `f_relation_asof(as_of)` · `f_neighbors(id, depth ≤ 3, as_of)`. 기준 `available_at` 하나. 원천을 넓히자 3홉이 시장 엔티티(소속 5천)를 지나 수 초 → **시장은 이웃으로 돌려주되 지나가지 않는다** · 홉마다 점 집합 → 종목 p95 95ms · 최대 170ms |
| FR-5 · 6 | **done 2026-11-16(5b-2 — 있는 원천 전부)** — 처음엔 마스터 · 심볼 · 원인 스냅샷만 넣고 'done' 이라 적었다(사용자 "온톨로지 이게 다야?" — 정정). 지금 원천: 종목 마스터(자산 · 회사 `listed_as` · 업종 · 시장 `belongs_to` · 별칭) · 코인 이름 · 원인 스냅샷 · DART 공시 목록(회사 `issued` 문서 · 문서 `mentions`) · 국내 시황 · 공시 제목 · 코인 기사(`mentions`, 관련 종목 1/n 확신) · 일정 사건(`affects` 시장 · 종목) · 일정 반응 통계 · 쏠림 신호 · β · σ · 거래소 경보 · 종목 상태(바뀔 때만). 엔티티 37,071 · 별칭 10,017 · 관계 42,978 · 사실 94,604 · 재적재 2회 같음 · 1.5초. 미해소 98(상장폐지 · 마스터 밖 심볼 — `unresolved`) |
| FR-7 | done — DDL 은 `salt-server/prisma` |
| FR-10~12 | to-do — 수기 라벨 200건(사람 몫). `mentions` 간선이 없어 아직 쓸 곳도 없다 |

## FR — 딥리서치 후보 — 추가 안 함(2026-11-16, 사용자 "온톨로지 더 … 딥리서치 없으면 안 해도 돼" → "추가 안 하는 게 맞겠네")

리서치 결론: 작게 둘 · 근거 중간 이하 · 방향 예측 실력이 아니라 ③ 원인 설명과 사건 창 하나. GNN 은 들이지 않는다(최근 전진 비교에서 Ridge 보다 못하고 무작위 그래프가 더 나음). 버린 후보 — 공급망 모멘텀(최근 소멸 · 국내 원천 없음) · 애널리스트 공동 커버리지(유료) · 공통 보유 기관(원천 없음) · 기사 동반 언급(비용 뒤 0 · 기사량) · 코인 같은 체인(분 단위) · 토큰 언락(무료 일정 원천 미확인 — 생기면 1순위).

| FR | 내용 | 상태 |
|---|---|---|
| FR-17 | **기업집단 소속** — 종목 `belongs_to` 기업집단(공정위 지정 명단 · DART 계열회사, valid_from = 지정일). 가설(등록 전): 같은 그룹 대표 계열사 ±2σ 날 뒤 다른 계열사 다음 1봉 부호 Brier 가 업종 몫 기준보다 낮다 · 원인 종류에 '그룹' | **추가 안 함**(사용자 2026-11-16 "그럼 추가 안 하는 게 맞겠네") — 근거 중간 이하 · 설명용. 기록만 |
| FR-18 | **임원 · 주요주주 장내 매수** — OpenDART 지분공시 → 인물 · 기관 `traded` 종목(접수 시각 = available_at · 보고 사유 코드로 규칙 분류, LLM 0). 가설(등록 전): 매수 공시 뒤 5 · 20봉 시장 대비 오른 비율 > 기저율(코스닥에서 더) | **추가 안 함**(같은 결정) — 유니버스가 대형주라 효과 약함 · 사건 수 적음 |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-10-30 | **FR-4 정정** — as-of 거르기 기준 `ingested_at <= as_of` → **`available_at <= as_of`**. `time-and-leakage.md` §1 "수집 시각은 available_at 이 아니다 — 백필하면 ingested_at 이 전부 오늘" 과 반대였다(백필 사실이 과거 as-of 에서 사라져 백테스트가 틀린다). 테이블에 `available_at` 열 추가 · `ingested_at` 은 감사용. 규칙 `ontology.md` §3 |
| 2026-11-10 | `FEATURE-017` 개정 — F017 은 온톨로지 전체를 기다리지 않는다. 필요한 것(소식 → 종목 · 사건 종류)만 `FC-REQ-028` FR-3 이 이미 있는 연결로 한다. 이 REQ 는 to-do 그대로(우선순위 뒤) |
| 2026-11-13 | **v4 재설계**(`requirements/specs/in-progress/F017-v4-one-panel-global-plan.md`) — FR-13~16: 사실 → 근거 → 원인 후보 → 결과 네 층 · 연결 셋 · 원인 설명 채점 · 새 원천. `FEATURE-017` 범위 안으로 |
| 2026-11-16 | **순서 5 구현**(`feat/f017-v4-s5-ontology-cause-scoring` · 루트 `requirements/specs/in-progress/F017-v4-stage5-ontology-slice.md`) — to-do → in-progress. FR-1~7 · 13 · 14 done(있는 재료만) · FR-15 사전등록 `cause-explain@1` 전진 · FR-4 정정(뷰 → 함수) · 딥리서치 후보 FR-17 · 18 — 추가 안 함(사용자 결정, 기록만) |
| 2026-11-16 | **FR-5 · 16 정정 · 확대**(사용자 "온톨로지 이게 다야? 너무 짧은 거 아니야" · "베스트 케이스로") — 원천 셋 → 열넷. 별칭 표 `entity_alias` · export 뷰 둘(`v_extracted_fact_export` · `v_crypto_name_export`) · 문서 id = 서버 사실 id(한 점). 첫 판 결함 고침: 코인 id 를 `KRW-` 째로 만듦(345개 — 표 비우고 재적재) · 3홉 폭발(시장 허브) |
