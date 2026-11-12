---
id: FE-REQ-055
feature: F015
area: frontend
kind: UI
title: "셸 — 홈 요약 카드 · 도메인 선택 온보딩 · 내 데이터 · 알림 설정"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-015-shell-home-onboarding.md
---

## Summary

셸은 도메인 코드를 모른다. 홈은 `HomeSummaryCard[]` 를 그리는 화면이고, 온보딩은 "무엇을 관리하고 싶나"를 고르는 3단계다.

## FR

| FR | 내용 | FEATURE-015 |
|---|---|---|
| FR-1 | `packages/core` `HomeSummaryCard` 타입(설계 문서 그대로) · 카드 컴포넌트 하나. 값은 서버 문자열 그대로 — FE 계산 0 | FR-2 |
| FR-2 | 홈 — 카드 순서 · 숨김 편집. 기본 순서 저축 → 가계부 → 투자 → 팁. 카드별 Suspense 경계, 실패 카드만 `degraded` | FR-2 |
| FR-3 | `FE-REQ-048`(홈 데스크톱) 배치를 카드 계약 위로 다시 읽는다 — 요약 타일 값은 카드 `primary/secondary` 에서 | FR-2 |
| FR-4 | 온보딩 — 도메인 선택(모으기 · 쓰는 돈 · 투자) → 고른 도메인 첫 입력 하나 → 끝. 첫 입력 폼은 해당 zone 화면으로 이동(`CrossZoneLink` + 돌아오기). 투자 미선택이면 투자 질문 0 | FR-1 |
| FR-5 | 내 데이터 — 내보내기 ~~요청 · 상태 ·~~ 받기, 계정 삭제(재인증 · 삭제 범위 표시). ✅ **done 2026-11-12(S3c)** — 셸 `/settings` 패널 둘: `features/export-my-data`(누르면 zip 저장 — 요청 · 상태 단계는 없다, 서버가 저장하지 않는다) · `features/delete-account`(비밀번호 다시 · 지워지는 범위 · 지운 행 수는 서버 `total` · 지운 뒤 세션 쿠키 지움 → 결과 한 줄 + 처음 화면으로) | FR-3 |
| FR-6 | 알림 설정 — 도메인별 켬/끔, 기본 꺼짐. ✅ 2026-11-06 S2c(셸 `/settings` — 로그아웃이면 패널 없음) | FR-4 |
| FR-7 | 개인정보 — LLM 에 보내는 필드 목록 화면(서버 API) | FR-5 |
| FR-8 | 문구 — "연결 · 연동" 0, 칭찬 · 재촉 0 | 정책 |

## 구현 현황 (2026-11-02 — 슬라이스 `requirements/specs/done/MONEY-F1-invest-zone-home-cards-slice.md`)

| FR | 상태 |
|---|---|
| FR-1 | ✅ `HomeSummaryCard` — `@repo/core/home`(BFF 정의와 글자 대조 테스트, 값 아래 한 줄 `note` 를 더했다 — 매입가 숨김 문장) · 셸 `entities/home`(조회 + 카드 하나 표시, 레지스트리 추가). 링크는 `ZoneLink`(레지스트리 판정) |
| FR-2 | 일부 — 카드 목록(BFF `order` · `hidden` 그대로). **순서 · 숨김 편집 없음**(저장할 곳이 서버 identity, S3). 카드별 Suspense 대신 응답 하나 · 카드별 `degraded`(토큰이 `localStorage` 라 서버 렌더 불가 — `FE-REQ-013`). 목표 목록은 저축 목록 화면(`/goals`)이 생길 때까지 홈에 남김(`FE-REQ-056`) |
| FR-3 | 미착수 — `FE-REQ-048`(to-do) 착수 때 |
| ~~FR-4 · 5 · 6 · 7~~ | ~~미착수 — 서버 identity(S3, `SRV-REQ-048`)~~ **정정 2026-11-06** FR-6 done(S2c) · FR-4 done(S3a, 아래) · FR-5 · 7 은 S3c |
| FR-4 | ✅ 2026-11-06 S3a — `widgets/onboarding-flow` 새로 · `features/choose-domains`. 초대 → 고르기 → 첫 기록(먼저 끝내고 그 zone 화면으로) → 끝. 경로 넷 실화면 |
| FR-2(편집) | ✅ 2026-11-06 S3a — 순서 · 숨김 편집은 셸 `/settings` 패널(`features/arrange-home`) — 홈은 읽기 전용(`fsd-widgets.md`) 그대로 |
| FR-8 | ✅ 카드 문구는 BFF — 금지어("연동 · 연결 · 칭찬 · 재촉") 0 |

## Acceptance Criteria

- [x] 셸 코드에 `domain-*` import 0(lint · 훅)
- [x] 홈 카드 하나 강제 실패 시 나머지 표시 — 실화면(Playwright 로 투자 카드만 degraded): 투자 "지금은 불러오지 못했어요", 0원 표시 없음
- [x] 온보딩 경로 3종 E2E — 2026-11-06 S3a 실화면(모으기 · 쓰는 돈 · 투자 + 둘 고르기 — 각 첫 기록 화면 도착)
- [x] 계정 삭제 실화면 — 2026-11-12 S3c(내려받기 · 틀린 비밀번호 안내 · 지움 → 쿠키 0 · 처음 화면 · 390 · 1440)
- [x] 금지 문구 grep 0(카드 문구 · `entities/home` 문구)

## 계약 영향

- **BFF 홈 계약 변경** `BFF-REQ-046` — `FE-REQ-053` 커밋 2 와 같은 PR

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | **in-progress** — FR-1 · 8 완료, FR-2 일부(편집 없음). 셸 `/settings` 는 투자 코치 설정 링크 목록이 됐다(FR-5 · 6 이 붙을 자리). 슬라이스 `requirements/specs/done/MONEY-F1-invest-zone-home-cards-slice.md` |
| 2026-11-02 | MONEY-F1(`FE-REQ-053`) 후속 — `0f8683f8` — 카드 계약에 값 아래 한 줄 `note` 추가(BFF · `@repo/core/home` 같이). 투자 카드가 매입가 숨김을 켰다고 확인된 사람에게 "오늘 처음 본다면" 줄 — 셸 카드가 값 아래 그린다. 실화면 켬/끔 확인 |
| 2026-11-02 | 커밋: `20971abf`(shared 패키지 — 카드가 쓰는 `@repo/web-shared`) · `62129b1d`(계약 `@repo/core/home`) · `417076d8`(셸 홈 카드) · `08a3aabf`(`ZoneLink` · 셸 `/settings`) · `0f8683f8`(`note`) · `562adfad`(로그인 상태 `/` → `/home`) |
| 2026-11-03 | MONEY-F2(`FE-REQ-054`) — 셸 홈 머리 — 프로필 메뉴가 화면이 아니라 공용 머리에서 온다(`e0bce695`). 홈 카드 계약 · 순서 무변경 |
| 2026-11-03 | MONEY-S1a — 이 REQ 에 걸린 몫(`c60f5bfb`): 홈 임시 목표 목록(`GoalsBlock`) 삭제 — `/goals` 가 생겼다. 홈 경계 2 → 1 |
| 2026-11-04 | 가계부 S1a(`MONEY-S1-household-entry`) — 변경 없음 기록 — 셸 홈 카드 계약(`HomeDomain` 에 이미 `household`)은 그대로, BFF 가 가계부 카드를 내기 시작했다(`b162ac6f`) |
| 2026-11-05 | FE-REQ-013 FR-80 2단계 확인 단계: 이 REQ 가 주인인 화면 파일의 낡은 이유 주석("토큰이 `localStorage` 라 클라이언트")에 정정 문장(`95829941`, 주석만 · 동작 0). 서버 조회 이관은 `FE-REQ-013` FR-81(국내 주식은 약관상 대상 아님). 루트 `requirements/specs/done/F000-cookie-session-slice.md` |
| 2026-11-06 | 서버 S2c(notification, 루트 `requirements/specs/done/MONEY-S2c-notification-slice.md`): FR-6 done — 셸 `/settings` 알림 패널(`entities/notification` · `features/toggle-alerts`) · 실화면 결함 셋 고침 |
| 2026-11-06 | 서버 S2c 확인 2회차 — 알림 줄 설명 대비(루트 `requirements/reports/checklists/MONEY-S2c-notification.md`) |
| 2026-11-06 | 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`): FR-4 · FR-2 편집 done. 고침 — 설정 패널(알림 · 홈 배치)이 저장 중 누른 것을 버리던 것(`scope` 로 차례 저장). 커밋 `c1baa77a` |
| 2026-11-06 | 서버 S3a 확인 2회차 — 결함: 만료 세션 `/onboarding` 이 "불러오는 중"에 머묾 → 401 = 세션 없음 · 초대 단계 `698da12b`. 실패 경로 넷 · 만료 세션 셋 실화면 |
| 2026-11-12 | 서버 S3c(루트 `requirements/specs/done/MONEY-S3c-identity-my-data-slice.md`): FR-5 done — 내려받기 · 계정 지우기 패널. FR-7(LLM 전송 필드 화면)은 S3d |
