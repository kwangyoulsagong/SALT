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
| FR-6 | ~~`POST /api/app/onboarding` — 도메인 선택 · 첫 입력~~ **정정 2026-11-06(S3a)** `GET /api/app/onboarding` · `PUT /domains` · `POST /finish` — 고르기와 끝내기가 따로(첫 입력은 다른 zone 화면에서 한다). 기존 3스텝 계약은 FE 전환 PR(이 PR)에서 삭제 — 410 |
| FR-7 | `POST /api/app/me/export` · `GET /api/app/me/export/:id` · `DELETE /api/app/me`(재인증) |
| FR-8 | `GET/PUT /api/app/me/notifications` — 도메인별. ✅ 2026-11-06 S2c(`PUT /:domain` · 값 검사는 서버) |
| FR-9 | 기존 홈 블록 경로(`/api/app/home/*`)는 FE 전환 뒤 삭제 — 그 전까지 병존 |

## 구현 현황 (2026-11-02 — 슬라이스 `requirements/specs/done/MONEY-F1-invest-zone-home-cards-slice.md`)

| FR | 상태 |
|---|---|
| FR-1 | ✅ `{ cards, order, hidden }` · 도메인 병렬 `allSettled`. **서비스가 없는 도메인(가계부 · 팁)은 카드를 내지 않는다** — 빈 카드나 degraded 로 "있는데 실패"처럼 보이지 않게. 저축 = 서버 `/goals/statistics`, 투자 = 보유 요약 · 코치 설정 · `/portfolio/stats` |
| FR-2 | ✅ `home-card.viewmodel.ts` 의 `CONTRACT` 블록 = `@repo/core/home` 글자 대조 테스트(변이로 확인). 값은 서버 숫자의 표시 포맷만 |
| FR-3 | ✅ 카드당 800ms — 넘으면 그 카드만 degraded |
| FR-4 | ✅ 보유 평가 + (매입가 숨김 끔 → 서버 총 손익률 · 켬/설정 실패 → 종목 수, F009 FR-27). 숨김을 켰다고 확인된 사람에게는 값 아래 "오늘 처음 본다면" 한 줄(계약 `note`, `0f8683f8`). 코치 한 줄은 싣지 않는다(3종 없는 판단 렌더 금지). 적립(F003) 없음. "투자 미선택이면 숨김"은 도메인 선택(FR-6) 뒤 |
| ~~FR-5 · 6 · 7 · 8~~ | ~~미착수 — 서버 identity(S3)~~ **정정 2026-11-06** FR-8 done(S2c) · FR-5 · 6 done(S3a, 아래 행) · FR-7 은 S3c |
| FR-5 | ✅ 2026-11-06 S3a — `PUT /api/app/home/layout` → identity. 화면은 보이는 카드 셋의 순서만 알아 모르는 칸(팁)을 BFF 가 뒤에 붙여 보낸다 · 값 검사는 서버 |
| FR-6 | ✅ 2026-11-06 S3a — `GET /api/app/onboarding` · `PUT /domains` · `POST /finish`(identity). 첫 입력 경로는 카드 href 와 같은 표(저축 `/goals/new` · 가계부 `/household/new` · 투자 `/investments`). 옛 `/status` 410 은퇴 |
| FR-4(추가) | ✅ 2026-11-06 S3a — "투자 미선택이면 숨김"은 서버 기본값(안 고른 도메인 숨김)으로 — 홈 `order` · `hidden` 을 identity 에서(배치 실패면 기본 순서 · 401 은 홈 전체 401) |
| FR-7 | ✅ 2026-11-12 S3c — `GET /api/app/me/export`(서비스 여덟 곳을 나란히 읽어 zip 하나 · **하나라도 못 읽으면 502 `EXPORT_INCOMPLETE`** — 일부만 담긴 파일을 "전부"로 내주지 않는다 · 저장 0 · README · `all.json` · 서비스/표.csv) · `DELETE /api/app/me`(`{ password }` → identity 허가 → 서비스 차례 → 계정 마지막 · 중간 5xx 면 멈추고 502 `ACCOUNT_DELETE_INCOMPLETE` — 다시 누르면 남은 것만 · 응답 `{ deleted, total }`). 정정: 내보내기 요청 · 상태 조회(`/export/:id`)는 만들지 않는다(서버가 저장하지 않는다) |
| FR-9 | ✅ 옛 블록 응답(`portfolio` · `unreadNotifications` · `marketOverview`)을 바로 지웠다 — 소비처 0(웹은 이 경로를 부르지 않았다, 모바일 미착수) |
| 추가 | 인증 거절(401)은 카드 degraded 로 덮지 않고 홈 401(`5b6d5320`) — 프론트 토큰 갱신 · 로그인 이동 |

## Acceptance Criteria

- [x] 서비스 하나 강제 실패 시 홈 200 + 그 카드만 `degraded` — 테스트(실패 · 800ms 초과) · 실화면
- [x] BFF 코드에 카드 숫자 계산 0 — 포맷만(`formatKrw` · `formatRate`), 손익률은 서버 `/portfolio/stats`
- [x] 내보내기는 전부 아니면 실패 · 삭제는 허가 → 순서 → 계정 마지막 · 중간 실패 멈춤 — 2026-11-12 S3c(`app-my-data.test.ts` 8 · 변이 · 실스택)
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
| 2026-11-04 | 가계부 S1a(`MONEY-S1-household-entry`) — 가계부 카드가 `CARD_SOURCES` 에 붙었다 — 이번 달 지출 + (예산 남은 금액 | 월말 예상 구간 | 비움). 기본 순서 저축 → 가계부 → 투자(`b162ac6f`). "서비스 없는 도메인은 카드 없음" 주석을 팁만으로 정정 |
| 2026-11-05 | FE-REQ-013 FR-80 2단계 쿠키 세션(`feat/fe-req-013-fr80-cookie-session`, 루트 `requirements/specs/done/F000-cookie-session-slice.md`): 파일만 걸침 — `apps/web/src/entities/home/api/homeApi.ts`(이 REQ 가 머리 주석 주인)에서 토큰 헤더(`authHeader()`)를 뺐다 · 로그인 여부 `useHasSession`. 토큰은 httpOnly 쿠키 · 같은 origin 이라 브라우저가 싣는다(`721063fc`). 화면 · 동작 무변경 |
| 2026-11-06 | 서버 S2c(notification, 루트 `requirements/specs/done/MONEY-S2c-notification-slice.md`): FR-8 done — `GET/PUT /api/app/me/notifications`(도메인 순서 · 목록은 서버 것) · `/api/app/alerts` 는 Kotlin `/notifications`(종류 셋) |
| 2026-11-06 | 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`): FR-5 · FR-6 · FR-4 숨김 기본값 done — 서버 identity(라우팅 `/identity` → platform). 옛 `/api/app/onboarding/status` 410 은퇴. 커밋 `066ba971` |
| 2026-11-12 | 서버 S3c(루트 `requirements/specs/done/MONEY-S3c-identity-my-data-slice.md`): FR-7 done — 내보내기 zip(Node zlib 직접, 라이브러리 0) · 계정 삭제 순서. 라우팅 표 platform 경로 셋(`BFF-REQ-045`) |
