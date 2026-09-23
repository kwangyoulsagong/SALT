---
id: SLICE-F004-SERVER-SCOREBOARD
title: "F004 슬라이스 11 — 서버 판단 성적표 그룹 · 수익률 분포, 로컬 표본 시드"
priority: high
labels: [F004, slice, server, contract, tooling]
created: 2026-09-23
---

## Summary

성적표를 신호 유형별로 여는 슬라이스다. `GET /api/coach/scoreboard` 를 만들고
`GET /api/signal-performance?groupBy=signalType` 에 같은 표를 붙였다. 이것이 없어
FE **추천 근거 상세**(`FE-REQ-026` FR-141)와 BFF `/api/app/coach/scoreboard` 가 멈춰 있었다.

함께 넣은 것은 **로컬 판단 표본 시드**다. 표본 20건 게이트 때문에 새 DB 에서는 판단 ·
해설 · 성적표의 렌더 경로를 한 번도 밟을 수 없었고(`SRV-REQ-025` 체크리스트 미검증 3건),
슬라이스 10 이 남긴 미검증 2건이 이 도구로 닫혔다.

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `SRV-REQ-025` | FR-15 · FR-53 | `?groupBy=signalType` 하위 호환 확장 · `returnDistribution` · `hits` · `misses` |
| `SRV-REQ-024` | FR-30 · 31 · 35 · 36(그룹 경로) · FR-160 · FR-161 | 신호 유형별 그룹 · `lowSample` · `insufficient_data` · 분포 6구간 + 사분위수 · 적중/실패 동등 |
| (도구) | — | `npm run judgments:seed` · `judgments:seed:clear` |

## 판단 — 리뷰가 볼 곳

1. **`horizonDays` 를 30 고정으로 두지 않았다** — 계약 초안은 `horizonDays: 30` 이었다.
   단타 판단의 관찰 기간은 24시간이고 그 표본에 "30일 수익률"이라고 쓰면 거짓이다.
   그룹 키가 `<mode>.<action>` 이라 기간이 그룹마다 확정되므로 그룹이 자기 기간을 말한다
2. **그룹은 판단 스냅샷에서 온다** — 기존 무인자 경로는 저장 추천 이력에 "지금 가격"을
   대어 수익률을 매기므로 시점이 섞인다. 스냅샷은 관찰 기간이 끝나 확정된 값이다.
   두 경로가 다른 소스를 쓰는 셈이고, 무인자 응답을 바꾸지 않는 것이 FR-15 다
3. **구간 경계가 도메인 배열 한 곳이다** — SQL 이 `RETURN_BUCKETS` 를 `FILTER` 로 펼친다.
   경계 11개(−0.2 · −0.1 · 0 · 0.1 · 0.2 전후)에서 SQL 과 정책 함수가 같은 구간을 고르는지
   실측했다
4. **시드가 판정을 지어내지 않는다** — 수익률은 고정 수열이지만 적중·실패는 `judgeOutcome`
   을 부른다. 규칙을 스크립트에 옮겨 적으면 시드가 규칙과 갈라진다

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `/api/coach/detail`(리포트 조립 · FR-1~9 · 16~18) | 저장 추천의 성적표 근거를 `IndicatorTrackRecord` 매핑 시드(`DB-REQ-019`)에서 가져올지 판단 스냅샷에서 가져올지가 미결 | 다음 서버 슬라이스 |
| `generate` 202 · 쿨다운 429 · `generation-status` · `defaultMode` | `CoachGenerationLog` · 프로필 컬럼 **마이그레이션 2개**가 필요하다. 스키마 변경을 이 PR 에 섞으면 되돌리기 지점이 둘이 된다 | 다음 서버 슬라이스 |
| 차트 키 통일 · `to` · 주/월/년 | 시세 컨텍스트 | 시세 서버 슬라이스 |
| 추천 근거 상세 화면(FR-141) | 이 계약 위의 FE 작업 | 다음 FE 슬라이스 |
