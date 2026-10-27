---
id: SLICE-F000-DORMANT-410
title: "F000 슬라이스 — 서버 동면 경로 410 · 홈 조립 동면 소스 제거 · /tax 링크 제거 (ADR-002 잔재)"
priority: medium
labels: [F000, F006, slice, server, bff, fe, dormant, ADR-002]
created: 2026-10-27
---

## Summary

2026-10-26 기획서 상태 정리(`docs/feature-status-sync`)에서 찾은 잔재 셋을 닫는다 — 사용자 "ADR-002 잔재 정리".

1. **서버 동면 경로가 살아 있었다.** BFF 는 2026-09-22 부터 410 인데 서버 `app.ts` 가 `/api/missions` · `/api/feed` ·
   `/api/dashboard` 를 아직 등록했다(`FEATURE-000` FR-10 · 12 · 13 · 14 "부분")
2. **BFF 홈 조립이 동면 소스를 불렀다.** 서버를 410 으로 바꾸면 `Promise.all` 하나가 `/api/app/home` 전체를 실패시킨다 —
   그래서 1 과 같은 PR 이다(서버 ↔ BFF 계약). 실은 **main 에서도 이미 깨져 있었다**: 서버 `/api/dashboard` · `/investment-insight/top` 이 언제나 500
3. **홈에 `/tax` 링크가 남아 있었다.** 세금은 ADR-002 로 빠졌는데 홈 브리핑이 자리표시 화면으로 보냈다(`FEATURE-006` FR-4)

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `SRV-REQ-009` | FR-7 · 8 | 동면 8경로 410 `{ code: 'ENDPOINT_DORMANT', revivable: true }` + 경로당 1회 로그 |
| `SRV-REQ-007` | FR-10 · 12 · 13 · 14 | 등록 해제 · 코드 · 모델 유지 · 되살리기 1회 |
| `BFF-REQ-007` | B절 FR-10~15 | 홈 조립 `allSettled` · 동면 호출 0 · 뷰모델 · `degradedBlocks` |
| `FE-REQ-030` | FR-3 | `/tax` 진입 링크 0건 |

## 판단 — 리뷰가 볼 곳

1. **살아 있는 라우터 안의 경로는 라우터보다 먼저 마운트해 가린다** — `/api/users/points` · `/api/users/achievements` ·
   `/api/users/dashboard` 는 `/api/users/profile` 과, `/api/investment-insight/top` 은 `/insights` 와 같은 라우터다.
   라우트 줄을 지우지 않고 목록 하나(`DORMANT_PATHS`)로 끈다 — 되살리기가 한 줄이다
2. **스펙 표의 `/api/investment-insight/ranking*` 을 실제 경로 `/top` 으로 읽었다** — `insight-ranking.controller` 가 그 경로다
3. **홈 조립은 F000 최소 구성까지만** — 블록 함수 · 블록별 엔드포인트는 F006(`BFF-REQ-027`)이 한다. 프론트 호출 0건이라 응답 shape 변경 영향이 없다
4. **`apps/web-tax` zone 은 그대로** — ADR-002 §5 · `FEATURE-006` Q1 의 아키텍처 결정이라 링크만 뺐다

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 서버 410 로그 1주 잔여 0건 | 시간 게이트 | 2026-11-03 (머지 · 상시 서버 재시작 뒤 1주) |
| `/api/dashboard` · `/api/feed` · `/api/investment-insight/top` 컨트롤러 `this` 결함(라우터가 묶이지 않은 메서드를 넘긴다 — 언제나 500) | 동면 코드 — 되살릴 때 고친다 | 되살리는 PR |
| `apps/web-tax` zone 존속 | 아키텍처 결정(ADR-002 §5 · F006 Q1) | 사용자 결정 |
| 알림 1종(`FEATURE-000` FR-11 · `BFF-REQ-007` C절) | 별도 묶음 | `notification` 컨텍스트 |
