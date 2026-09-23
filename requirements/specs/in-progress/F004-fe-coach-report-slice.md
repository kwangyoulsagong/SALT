---
id: SLICE-F004-FE-COACH-REPORT
title: "F004 슬라이스 15 — FE 코치 리포트 /coach/report · 추천 게이트 카드 · 재생성"
priority: high
labels: [F004, slice, fe, render-gate, polling]
created: 2026-09-23
---

## Summary

슬라이스 14 가 연 BFF 계약(`/api/app/coach/report` · `generation-status` · 재생성 202/429) 위에 코치 리포트 화면을 올린다.
지금 서버의 저장 추천은 **전부 막힌다**(실패사례 출처가 F003) — 그래서 이 화면의 첫 모습은 "표본이 쌓이는 중" 안내 +
막힘 사유다(FR-143). 카드 본체는 계약이 열리는 날 그대로 그려지도록 타입과 방어적 재확인까지 넣었다.

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `FE-REQ-026` | M FR-140 · 143 · 144, A FR-1~5 · 7, B FR-10~14, C FR-20 · 21, D FR-30~33, E FR-40~45, G FR-60 · 61, H FR-73~76, J FR-90~93 | 리포트 화면 · 추천 카드 게이트 · 익절 · 행동 기록 · 재생성 · 면책 |
| `FE-REQ-027` | FR-1~7 · 12 · 15 · 21~24 · 40~46 · 70~72 · 94 | 게이트 재확인 · 무계산 · 코드 → 문장 · 쿨다운 · 부분 실패 |
| `FE-REQ-028` | FR-3 · 4 · 20~26 | 조회 · 재생성 · 폴링 |

## 판단 — 리뷰가 볼 곳

1. **후보 목록을 그리지 않는다** — BFF 는 싣지만 근거 · 성적 · 실패사례가 없어 공통 수용 기준 1 을 어기고, 막힌 추천의 종목이
   후보 1위로 새어 나간다. `@repo/core` 사본에서 필드를 뺐다(타입에 없으면 읽을 길이 없다)
2. **`staleHours > 24` 임계를 두지 않았다** — 경과 시간은 사실로 늘 보이고 버튼을 막는 것은 서버 쿨다운 하나다. FR-73 과 다르다
3. **폴링 완료 판정이 내 요청의 행만 본다** — 워커 행의 `succeeded` 를 내 성공으로 읽지 않는다. 대신 아무것도 돌지 않으면 `settled`
4. **zone 에 `/coach` 추가** — 레지스트리와 web-tax lint 목록 두 곳(기존 CommonJS 절충)

## 커밋

- `78ec156` docs(fe-rules) — features 레지스트리에 `regenerate-coach`
- `c030f4e` feat(core) — 리포트 뷰모델 사본 · `readGenerationOutcome`(테스트 6) · zone `/coach`
- `8921ab5` feat(fe) — entities · feature · widget · page · 홈 진입

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 신호 성적표 표(FR-22 · 23) | BFF 성적표 그룹 경로가 없다 | 다음 BFF · FE 슬라이스(추천 근거 상세와 함께) |
| 피드백(H FR-70~72) · 성향 설정(I) · 주문 전 계산(F) | BFF 경로 · 화면이 각각 따로다 | 각 슬라이스 |
| 추천 근거 상세 `/coach/signals/[signalType]`(FR-141 · 142) | 성적표 BFF 와 같이 | 다음 슬라이스 |
| 후보 목록 | 게이트 계약이 없다 | PM · BFF 결정 후 |
| 코치 탭 `/coach` | F006 대화 화면 | `FE-REQ-030` |
