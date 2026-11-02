---
id: FE-REQ-053
area: frontend
kind: ARCH
title: "F1 — 투자 zone 분리: coach · market · portfolio → packages/domain-invest + apps/web-investment"
priority: high
created: 2026-10-30
source: requirements/decisions/ADR-005-domain-zones.md
---

## Summary

지금 투자 화면 전부가 셸(`apps/web`) 안에 있다(entities/coach 8,559줄 · market 4,759줄 + portfolio · 관련 features · widgets · pages).
가장 큰 이동이라 먼저 해서 규칙을 증명한다. **동작 변경 0** — 투자 동결.

## FR

| FR | 내용 |
|---|---|
| FR-1 | 커밋 1(기계적 이동) — 투자 슬라이스를 `packages/domain-invest/src/{entities,features,widgets,pages}` 로 `git mv`. import 경로만 바꾼다. 동작 · 스타일 변경 0 |
| FR-2 | 커밋 2(조립) — `apps/web-investment/app/{investments,investments/[symbol],coach/report,coach/signals/[type],search}` 라우트가 패키지 pages 를 렌더. 셸에서 해당 라우트 삭제 |
| FR-3 | 셸 홈의 `home-briefing` 이 coach · portfolio 를 직접 읽는 것을 끊는다 → `FE-REQ-055`(홈 카드)와 **같은 PR**(BFF 홈 계약 변경 `BFF-REQ-046`) |
| FR-4 | 투자 zone 안 탭(시장 · 코치 · 내 자산) — F006 FR-1~6 "3탭"을 zone 안 탭으로 다시 읽는다. FEATURE-006 문서 갱신은 PM 몫 |
| FR-5 | 실시간 시세 WebSocket · SSE 해설 연결이 zone 안에서 그대로(연결 주인 = 투자 zone) |
| FR-6 | 셸 ↔ 투자 이동 실측 — 전환 시간 · 가격 깜빡임(Chromium · Safari). 결과를 `FE-REQ-054` 착수 기준으로 |
| FR-7 | 기존 투자 REQ(F004 · F006 · F008 · F009 · F011 · FE-REQ-046 · 049 · 050)의 파일 경로가 바뀐다 — 각 REQ Changelog 에 "경로 이동 FE-REQ-053" 한 줄 |

## 구현 (2026-11-02 done — 슬라이스 `requirements/specs/done/MONEY-F1-invest-zone-home-cards-slice.md`)

| FR | 결과 |
|---|---|
| FR-1 | 슬라이스 25개(entities 3 · features 11 · widgets 7 · pages 4) → `packages/domain-invest/src` — 369 파일 전부 R100(내용 무변경). 패키지 안 레이어 alias 는 그대로, zone 앱 `tsconfig` paths 가 패키지로 푼다. **먼저** shared 레이어를 `packages/web-shared` 로(`20971abf`, 사용자 결정 — core · ui 로 쪼개지 않는다)와 zone 공용 레이아웃(`@repo/web-shared/layout`: 프로바이더 · 프레임 · 프로필 메뉴 · 404 · 글꼴)을 올렸다 — 패키지는 셸 `src` 를 import 못 한다 |
| FR-2 | `apps/web-investment/app` 라우트 6 + `not-found` + `/investments/sitemap.xml`. 셸 라우트 삭제와 `invest.hostedIn` → `web-investment` 를 한 커밋(`b00b0cea` — 되돌리기 지점) |
| FR-3 | 홈 투자 블록 → BFF 카드(`417076d8` · `FE-REQ-055`) — 셸의 투자 import 0 |
| FR-4 | 투자 zone 안 이동은 같은 앱(soft) — "3탭" 재해석은 FEATURE-006 이력에 적음 |
| FR-5 | 실시간 시세 WS(투자 표 실시간 기준 시각 갱신) · 해설 SSE(투자 zone 페이지에서 `explain/stream` 200 `text/event-stream` · `message.start` → `step`, main 과 같음) |
| FR-6 | 셸 홈 카드 → `/investments` 누름부터 새 문서까지(dev 서버 · 셸 프록시 경유 · 5회 중앙): Chromium 455ms · WebKit 447ms, 되돌아오기(카드까지) 476 · 562ms. 로드 시점 숫자 5/5. `FE-REQ-054` 착수 기준 |
| FR-7 | 경로가 바뀐 · 파일이 걸친 기존 REQ 40곳 Changelog · 체크리스트 · 회고에 한 줄씩 |
| 판단 | 홈 보유 목록 → 코치 리포트 맨 위 "내 보유"(사용자 결정, `c5ec66ed`) · `/settings` 내용(전부 투자)을 `/coach/settings` 로, 셸 `/settings` 는 링크 목록(사용자 결정 2026-11-02) · zone 을 넘는 셸 이동 2곳(404 링크 `ZoneLink` · 온보딩 `useZoneNavigate`) |

## Acceptance Criteria

- [x] 커밋 1 diff 가 rename + import 경로뿐 — 슬라이스 이동 커밋(`b00b0cea`) 369 파일 R100. import 경로 치환은 앞 커밋(`20971abf`)
- [x] 투자 화면 이동 전후 동일 — 스크린샷 대신 DOM 구조 대조(숫자 지움, main 3100 vs 3000): 상세 · 리포트 · 검색 · 404 0 차이, `/investments` 는 의도한 시세 타일 수정(`a55d8ca4`)뿐
- [x] 셸 코드에 `domain-invest` import 0(lint · 훅 `shell-domain`)
- [x] 가격 깜빡임 0 — 화면 코드 무변경(R100) · 로드 시점 숫자 5/5

## 계약 영향

- BFF 홈 계약 `BFF-REQ-046`(같은 PR)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | `FE-REQ-052` done — `apps/web-investment` 빈 골격 · 레지스트리 `invest` 가 생겼다. **FR-2 에 더한다**: 셸 라우트를 지우는 커밋에서 `registry.json` `invest.hostedIn` 을 `"web"` → `"web-investment"` 로(그래야 셸 링크가 cross-zone 으로 잡히고 rewrites `fallback` 이 zone 으로 보낸다). FR-1 에서 `packages/domain-invest` 를 만들 때 `.eslintrc`(`@repo/fsd/layers`)를 같이 넣고 `cross-domain` 변이를 ESLint 로 확인. `ops/salt.sh` 이름 표에 `web-investment`(3002) |
| 2026-11-02 | **done** — 위 "구현" 표. 슬라이스 `requirements/specs/done/MONEY-F1-invest-zone-home-cards-slice.md`. 같이 고친 기존 결함 6(실화면 확인 중 발견): `/search` 수화 불일치(조회 훅 14곳) · 코치 프로필 첫 저장 경합 500 · 관심 종목 시세 갱신이 연결 풀 점유 · 웹 글꼴 404 · 시세 타일 변동률 잘림 · 로그인 상태에서 `/` 로그인 화면 깜빡임 — 각 주인 REQ 에 기록 |
