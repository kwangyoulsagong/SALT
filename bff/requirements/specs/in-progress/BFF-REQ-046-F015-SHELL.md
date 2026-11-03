---
id: BFF-REQ-046
feature: F015
area: bff
kind: API
title: "셸 — 홈 요약 카드 조립(HomeSummaryCard[] · allSettled) · 도메인 선택 온보딩 · 내보내기 · 알림 설정"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-015-shell-home-onboarding.md
---

## Summary

`/api/app/home` 은 지금 coach · portfolio 블록을 직접 조립한다. 셸이 도메인을 모르게(`ADR-005` §2) **도메인마다 카드 한 장**으로 바꾼다. **계약 변경** — 프론트 `FE-REQ-055` 와 같은 PR.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `GET /api/app/home` → `{ cards: HomeSummaryCard[], order, hidden }`. 서비스 4곳(`savings` · `household` · `invest`(coach+portfolio 요약) · `tips`) 병렬 `allSettled`, 실패 카드는 `state:"degraded"` |
| FR-2 | `HomeSummaryCard` 타입은 `@repo/core` 와 같은 정의(BFF 가 import 하거나 `contracts/` 에서 생성). `primary.value` 는 서버 포맷 문자열 — BFF 도 숫자 계산 0 |
| FR-3 | 카드 타임아웃 800ms — 넘으면 그 카드만 `degraded` |
| FR-4 | 투자 카드 — 보유 평가 한 줄 + "이번 주 투자 적립"(F003, 있으면) + 코치 한 줄. 투자를 고르지 않은 사용자는 카드 숨김이 기본 |
| FR-5 | `PUT /api/app/home/layout` — 순서 · 숨김 |
| FR-6 | `POST /api/app/onboarding` — 도메인 선택 · 첫 입력. 기존 3스텝 계약은 FE 전환 PR 까지 유지 후 삭제 |
| FR-7 | `POST /api/app/me/export` · `GET /api/app/me/export/:id` · `DELETE /api/app/me`(재인증) |
| FR-8 | `GET/PUT /api/app/me/notifications` — 도메인별 |
| FR-9 | 기존 홈 블록 경로(`/api/app/home/*`)는 FE 전환 뒤 삭제 — 그 전까지 병존 |

## 구현 현황 (2026-11-02 — 슬라이스 `requirements/specs/done/MONEY-F1-invest-zone-home-cards-slice.md`)

| FR | 상태 |
|---|---|
| FR-1 | ✅ `{ cards, order, hidden }` · 도메인 병렬 `allSettled`. **서비스가 없는 도메인(가계부 · 팁)은 카드를 내지 않는다** — 빈 카드나 degraded 로 "있는데 실패"처럼 보이지 않게. 저축 = 서버 `/goals/statistics`, 투자 = 보유 요약 · 코치 설정 · `/portfolio/stats` |
| FR-2 | ✅ `home-card.viewmodel.ts` 의 `CONTRACT` 블록 = `@repo/core/home` 글자 대조 테스트(변이로 확인). 값은 서버 숫자의 표시 포맷만 |
| FR-3 | ✅ 카드당 800ms — 넘으면 그 카드만 degraded |
| FR-4 | ✅ 보유 평가 + (매입가 숨김 끔 → 서버 총 손익률 · 켬/설정 실패 → 종목 수, F009 FR-27). 숨김을 켰다고 확인된 사람에게는 값 아래 "오늘 처음 본다면" 한 줄(계약 `note`, `0f8683f8`). 코치 한 줄은 싣지 않는다(3종 없는 판단 렌더 금지). 적립(F003) 없음. "투자 미선택이면 숨김"은 도메인 선택(FR-6) 뒤 |
| FR-5 · 6 · 7 · 8 | 미착수 — 서버 identity(S3) |
| FR-9 | ✅ 옛 블록 응답(`portfolio` · `unreadNotifications` · `marketOverview`)을 바로 지웠다 — 소비처 0(웹은 이 경로를 부르지 않았다, 모바일 미착수) |
| 추가 | 인증 거절(401)은 카드 degraded 로 덮지 않고 홈 401(`5b6d5320`) — 프론트 토큰 갱신 · 로그인 이동 |

## Acceptance Criteria

- [x] 서비스 하나 강제 실패 시 홈 200 + 그 카드만 `degraded` — 테스트(실패 · 800ms 초과) · 실화면
- [x] BFF 코드에 카드 숫자 계산 0 — 포맷만(`formatKrw` · `formatRate`), 손익률은 서버 `/portfolio/stats`
- [x] 프론트 타입과 같은 정의 — `home-card-contract.test.ts`(필드 하나 바꾸는 변이에 실패)

## 계약 영향

- **BREAKING(홈)** — `FE-REQ-055` 와 같은 PR. 서버 `SRV-REQ-045`~`048` 의 `home-card`

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | **in-progress** — FR-1~4 · 9 완료(위 표), FR-5~8 은 서버 identity(S3). 실서버(임시 사용자): 카드 2장 · 숨김 끔 +5.7% / 켬 종목 수 · 잘못된 토큰 401. 슬라이스 `requirements/specs/done/MONEY-F1-invest-zone-home-cards-slice.md` |
| 2026-11-02 | 커밋: `62129b1d`(계약 · 조립) · `417076d8`(프론트 소비 — 계약 테스트가 읽는 `@repo/core/home`) · `d28f1c0a`(손익률 · 매입가 숨김) · `5b6d5320`(401) · `0f8683f8`(`note`) |
| 2026-11-03 | MONEY-S1a — 이 REQ 에 걸린 몫(`3e5e0d42` · `b1c8ad67`): 저축 카드 원천 `/goals/statistics` → `/savings/home-card` · `href` `/goals/addgoals` → `/goals` · `note` = 진척이 가장 큰 진행 중 목표 한 줄(서버 퍼센트 그대로). 테스트 1 추가 |
