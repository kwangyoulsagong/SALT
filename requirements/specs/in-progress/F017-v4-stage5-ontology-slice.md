---
id: SLICE-F017-V4-STAGE5
title: "F017 v4 순서 5 — 원인 스냅샷 · 온톨로지 네 층 · 원인 설명 채점"
priority: high
labels: [F017, slice, forecast, server, db, ontology]
created: 2026-11-16
status: in-progress (5a · 5b · 5c 구현 2026-11-16 — 채점 판정 2027-01-15 · 02-14 · 03-16)
---

## Summary

전 영역 계획 `F017-v4-one-panel-global-plan.md` 의 순서 5 — *"사실 근거 원인"* · *"다 설명할 수 있잖아 우린 다 데이터가 있는데"*(D25).
사용자 2026-11-16 "새 브랜치 파고 다음 파이프라인 진행". 화면 · BFF 응답 변경 0.

| 칸 | 내용 | REQ | 상태 |
|---|---|---|---|
| 5a | 원인 스냅샷 — 패널 원인 칸과 같은 조립을 **결과 전에** 저장. 찍는 창: 국내 장 뒤 · 코인 하루 끝 직전 | `SRV-REQ-053` FR-18 · `DB-REQ-043` FR-8 | **done** — 국내 50종목 첫 기록 |
| 5b | 온톨로지 네 층 — ① 엔티티 · 관계 · 사실 ② 근거 ③ 원인 후보 ④ 결과 · as-of 함수 셋 · 매일 `ontology_build` | `FC-REQ-022` FR-1~7 · 13 · 14 · `DB-REQ-043` FR-15 | **done(있는 재료만)** |
| 5c | 원인 설명 채점 — 사전등록 `cause-explain@1`(결과 전 커밋 `898eec54`) · 매일 `cause_explain` | `FC-REQ-022` FR-15 | **전진 시험** — 판정 2027-01-15 ~ |

## 판단 — 리뷰가 볼 곳

1. **원인은 지금 다시 만들 수 없다** — 조립 재료가 '지금' 기준이라 과거 날을 재생하면 미래가 섞인다. 그래서 과거 판정 없이 오늘부터 기록 → 전진만
2. **찍는 창을 서버 도메인 한 곳에** — 화면의 '오늘'은 KST 날짜(`toView(today…)`)라 장 전에는 어제 등락, 장중에는 반나절 등락이 그날로 보인다.
   국내 15:40~23:59 · 코인 08:00~08:59(거래일 = 전날) 밖이면 찍지 않는다 — 맥이 잠든 날은 빈 날로 남긴다
3. **채점 대상 = 원인 종류가 다음 등락에 주는 정보** — 오늘 등락은 조립 규칙상 늘 맞는다(받치는 근거가 있어야 원인). 기준 = 업종(코인은 시장) 몫 부호만 안 것
4. **처음 안 값을 지킨다** — 관계 · 사건 · 사실 · 후보는 `keep_existing`(나중 기록이 available_at 을 늦추면 과거 as-of 에서 사라진다). 마스터 소속은 매일 새 행이 아니라 바뀔 때만 옛 관계를 닫는다
5. **FR-4 뷰 → 함수** — 뷰는 as_of 인자를 못 받는다. `f_fact_asof` · `f_relation_asof` · `f_neighbors`(3홉)
6. **딥리서치(사용자 요청) — 추가 안 함** — 후보 둘(기업집단 소속 · 임원 · 주요주주 매수)은 근거 중간 이하 · 설명용이라 사용자가 넣지 않기로("추가 안 하는 게 맞겠네"). 그래프 신경망도 들이지 않음. 기록 `FC-REQ-022` FR-17 · 18

## 하지 않은 것

- ① 사실에 공시 · 기사 추출 사실 · 환율 · 금리 싣기(FC-REQ-022 FR-16) · 뉴스 `mentions` · 수기 라벨 200건(FR-10~12)
- 서버가 온톨로지를 읽는 경로 · 화면 문구 — 채점 통과 뒤
- 딥리서치 후보 둘(FR-17 · 18) — 사용자 결정으로 추가 안 함

## 관련

- 사전등록 `salt-forecast/preregistration/2026-11-16-cause-explain.toml` · 리포트 `salt-forecast/reports/cause-explain-cause-explain-1-2026-11-16.md`
- 체크리스트 `requirements/reports/checklists/F017-v4-stage5-ontology.md` · 회고 `requirements/reports/retrospects/F017-v4-stage5-ontology.md`

## Changelog

| 날짜 | 내용 |
|---|---|
| 2026-11-16 | 생성 · 5a · 5b · 5c 구현(`feat/f017-v4-s5-ontology-cause-scoring`) — 원인 스냅샷 국내 50 · 온톨로지 적재 · 사전등록 `cause-explain@1` · 딥리서치 후보 둘 — 추가 안 함(사용자 결정) |
