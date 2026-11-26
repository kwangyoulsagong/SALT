---
id: FE-REQ-072
feature: F019
area: frontend
kind: UI
title: "휴대폰 화면 옮기기 — 웹뷰 배치(홈 · 저축 · 가계부 · 투자 상세)를 /m 으로 · 앱 웹뷰 계약 걷기"
priority: high
created: 2026-11-20
source: 사용자 "웹뷰 배치를 PWA로 전환" · ADR-012
---

## Summary

`ADR-012` 순서 2. `FE-REQ-060` FR-M(앱 웹뷰 휴대폰 배치 — 같은 HTML 에 CSS 로)과 F017 v4 순서 6 웹뷰 몫(옛 `RN-REQ-032` FR-7 · 8 · 10)을 **도메인 패키지 `mobile` 진입점**으로 옮긴다. 데스크톱 화면에서 휴대폰 분기가 사라진다.

## 결과(2026-11-20 done)

| FR | 결과 | 어디 |
|---|---|---|
| FR-1 | done | 도메인 패키지 `src/mobile/<page>`(레이어 `mobile` — pages 의 형제 · 높이 4 · `pages` import 금지 · 레지스트리 여섯) · `exports` `./mobile/*` · `/m` 한 빌드의 `@/…` 는 `tsconfig` 폴백 배열(슬라이스 이름 레이어별 유일 — `mobileAlias.test.ts`). 홈은 **BFF 카드 계약**(`@repo/web-shared/layout/mobile/home` — 셸 코드는 `/m` 이 못 가져온다) |
| FR-2 | done | `/m/home`(배너 · 카드 행 · 최근 · 다가오는 일) · `/m/goals`(요약 30 · 목표 행 → 상세 push · 저축 도구 — `widgets/goal-tools` 로 내림) · `/m/goals/[id]`(요약 · 계획 · 상태 셋 · 적립 · 접힘 · 하단 "넣기" → 시트) · `/m/household`(요약 · 확인할 것 · 세그먼트 넷 · 하단 "지출 적기" → 시트) |
| FR-3 | done | `/m/investments`(코치 리포트 행 · 관심 종목) · `/m/investments/[symbol]`(머리 이름 · 가격 + 한 장 패널 한 열 — 패널만 따로 경계) · `/m/coach/report`(투자 탭). 스트림 복귀는 위젯 `useExplanationStream` 그대로 |
| FR-4 | done | `@repo/core/embed` · `EMBED_SCRIPT` · `useInAppWebview` · `app.css`(`deskOnly`) · `AppSummary`/`AppSheetAction`(→ `MobileSummary`/`MobileSheetAction`) · 셸 `OnboardingCard` 지움. 같이 쓰는 조각의 휴대폰 값은 `/m` 서버 HTML 표지 `data-surface`(`ON_MOBILE` · `MOBILE_ROOT`). `appType` 래칫 대상 = 휴대폰 표면(`src/mobile` 포함) · `ON_MOBILE` 파일 — 데스크톱 `pages` 의 휴대폰 표지 0 시험 |
| FR-5 | done | 390(iPhone) · 360(Android) 11화면 — 가로 넘침 0 · 글자 13 미만 0 · 누름 44 미만 0 · 글자 ×2 넘침 · 잘림 0(실측에서 찾은 22곳 고침 — 디자인 시스템 작은 단은 크기 표지로) |

대응표(`mobileRedirects`): `/home` · `/goals`(아래 포함, `/goals/new` · `/goals/addgoals` 제외 — `except`) · `/household` · `/investments`(아래 포함) · `/coach/report`. 체크리스트 `requirements/reports/checklists/FE-REQ-072.md`.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `@repo/domain-savings/mobile/*` · `domain-household` · `domain-invest` 진입점(`src/mobile/<page>` — pages 형제, 자기 entities · features · widgets 재사용) · 홈은 셸 `entities/home` 을 패키지로 옮기거나 BFF 카드 계약으로 `/m/home` |
| FR-2 | 옮길 배치 — 홈 목록 행 + 시작하기 배너 · 저축 목록 → 상세 push · "넣기" 하단 버튼 → 시트 · 가계부 세그먼트 넷 · "지출 적기" → 시트 · 주인공 숫자 30(`appType`) |
| FR-3 | 투자 — `/m/investments/[symbol]` 한 장 패널 한 열 · 스트림 복귀(옛 `RN-REQ-032` FR-8 웹 몫) · `/m/coach/report` |
| FR-4 | 걷기 — `SALTApp/` UA · `EMBED_SCRIPT` · `data-embed` · `IN_APP_WEBVIEW` · `useInAppWebview` · 데스크톱 화면의 `deskOnly` 분기. `appType` 토큰은 모바일 zone 전용 단으로(래칫 시험 대상 이동) |
| FR-5 | `screen-mobile.md` 값(터치 44 · 글자 13 이상 · 글자 ×2 넘침 0)을 `/m` 실측으로 다시 |

## 검증

- 390 · 360 휴대폰 실측(웹뷰 UA 가 아니라 휴대폰 브라우저 UA) · 데스크톱 화면 배치 변화 0 · 데스크톱 첫 로드 번들 감소 측정
- `grep -r "IN_APP_WEBVIEW\|SALTApp\|data-embed"` 0

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-20 | 신규(to-do) — `ADR-012` 순서 2 |
| 2026-11-20 | **done**(`feat/fe-req-072-mobile-screens`) — FR-1~5. 홈은 BFF 카드 계약(셸 엔티티를 패키지로 옮기지 않음) · 저축 도구 `widgets/goal-tools` · 요약 칸 엔티티로(`goalSummaryItems` · `householdSummaryItems`) · `/m` 표지 `data-surface` 로 웹뷰 선택자 대체 · 디자인 시스템 크기 표지 넷 · 서버 조회 입구 `api/server`. 투자 탭 `/m/investments` 는 FR 에 없던 탭 화면(관심 종목 · 리포트 행)이라 더했다. 루트 `requirements/specs/done/F019-s2-mobile-screens-slice.md` |
| 2026-11-20 | 사용자 "모바일 디자인은 원래 내가 만들어놓았던 형식으로" · "카드 레이아웃이랑 배경 배치만" — 사용자 Figma "홈"(390) 실측으로 탭 화면 바탕 grey100 위 흰 카드(모서리 20 · 안쪽 20 · 좌우 15 · 사이 14). 카드 안 내용은 그대로 |
| 2026-11-20 | 사용자 기준 화면 13장("이렇게 만들어야돼" · "카드랑 저런 아이콘 그리고 글래스 느낌") — 분석 `requirements/reports/research/2026-11-20-mobile-reference-screens.md`. 글래스 하단 탭 · 홈 금액 행(아이콘 판 44 · 금액 22 · 회색 알약 · 바닥 줄) · 상세 세 화면 흰 섹션 + 회색 띠 · 떠 있는 시트(모서리 32) · 홈 머리 프로필. 주문 버튼 · 호재/악재 이름표는 옮기지 않음. 390 · 360 22화면 넘침 · 13 미만 · 44 미만 0 |
| 2026-11-20 | `FE-REQ-074` 가 걸침(`feat/fe-req-074-mobile-tab-interiors`) — 탭 · 상세 안쪽을 홈 수준으로 — 요약 금액 카드(`MobileSummary icon`) · 목록 판 44 · 투자 탭 바로가기 카드 · 상세 머리 · 리포트 흰 섹션 |
| 2026-11-20 | 걸침 — `FE-REQ-076` 1단계(데스크톱 카드 판): 가계부 · 저축 요약에 `icon` 을 넘기는 데스크톱 화면만 바뀜 — `/m` 배치 변화 0(390 대조) |
| 2026-11-21 | 걸침 — `FE-REQ-073`(`feat/fe-req-073-mobile-offline-install`): `MobileSheetAction` 오프라인이면 막힘 + 이유 한 줄 · 저축 · 가계부 · 홈이 한 벌을 저장하고 받기 실패 자리에 그린다 |
| 2026-11-21 | 걸침 — `FE-REQ-078`(`feat/f019-s4-web-push`): 휴대폰 홈 맨 아래 설치 안내 다음에 알림 칸(`MobilePushCard`). 다른 칸 변화 0 |
| 2026-11-26 | 걸침 — `FE-REQ-062`(`feat/fe-req-062-interaction-motion`): 근거 상세 분포 막대 차오름(`growInX`) |
| 2026-11-26 | 파일만 걸침 — 홈 미리보기 컴포넌트 파일 머리(휴대폰 홈 무변경). 이 REQ 의 동작 변경 0. 루트 `requirements/specs/in-progress/F000-desktop-dashboard-slice.md` |
