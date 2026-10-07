---
id: FE-REQ-045
feature: F009
area: fe
kind: UI
title: "F009 FR-33 — 성적 4요소 한 줄(PerformanceClaimLine) · 틀린 성적 라벨 정정"
priority: high
created: 2026-10-07
source: pm/requirements/specs/in-progress/FEATURE-009-behavior-risk-coach.md FR-33 · bff/requirements/specs/done/BFF-REQ-042-F009-PERFORMANCE-CLAIM.md
---

## Summary

서비스 성적 자리마다 **기간 · 표본 · 기준 · 빗나간 수** 한 줄을 붙인다. 칸 넷을 늘 같은 순서로 다 그리고, 값이 없는 칸은 이유를 쓴다
(사용자 결정 2026-10-07). 같은 작업에서 숫자의 뜻과 라벨이 어긋난 세 곳을 고쳤다.

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `entities/coach/ui/PerformanceClaimLine.tsx` · `model/claimMessages.ts` — 목록(`ul aria-label="성적 기준"`) 4항목, `unit`(회 · 주). `claim` 이 `null` 이면 그리지 않는다. 가운뎃점은 앞 항목 끝 `::after`(줄이 바뀌어도 새 줄 앞에 점이 남지 않게, 360 실측) | 완료(`2501453`) |
| FR-2 | `@repo/core/coach` `PerformanceClaim` 타입(BFF 사본) · 7개 뷰모델 타입에 `claim` | 완료 |
| FR-3 | 붙인 자리: 판정 상세 `TrackRecordStats`(해설 카드 공유) · 추천 카드 · 성적표 그룹 · 게이지 줄 · 변동 범위(표 아래 기간별) · 주요 사건 · 쏠림 반응 · 목표 비중 본문(라이브 · 백테스트 자리) · 요약 띠 목표 비중 칸(기간 · 주 수) | 완료 |
| FR-4 | 라벨 정정: "틀렸던 때 N건" = 표본 전체 빗나간 수(전에는 목록 상한 3, claim 없으면 "최근 틀렸던 때 N건") · 추천 "최근 N회" → "표본 N회"(전체 기간이다) · 사례 제목 "맞았던 때 · 틀렸던 때" → "최근 틀렸던 때"(틀린 것만 온다) | 완료 |
| FR-5 | 게이지 줄 기준: "오른 비율 56% (모든 날 52%)" | 완료 |
| FR-6 | 성적표 빗나간 판정 목록 키 중복(같은 날 · 종목 · 판단 2건) 경고 정정 | 완료 |

## 하지 않는 것

- 투자 화면 판정 성적표 요약 칸(`judgment-overview`) — 적중률을 보이지 않고 전체 성적표로 이어지는 링크 칸이다. 합계 claim 은 서버에 없고 프론트에서 합치지 않는다
- 미러 · 월간 복기 · 보유 손익 — 본인 기록(사용자 결정)
- 문구 금지어 런타임 검사 — 서버 `languageGuard`. 프론트 문구는 grep 0건 확인

## Changelog

- 2026-10-07: 초판 · FR-1~6 코드 완료(`2501453`). 추천 카드 실데이터 · 게이지 줄 자른 화면이 남아 in-progress
