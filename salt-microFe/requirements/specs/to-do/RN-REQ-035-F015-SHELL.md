---
id: RN-REQ-035
feature: F015
area: rn
kind: UI
title: "셸(네이티브) — 4탭 · 홈 카드 · 도메인 선택 온보딩 · 도메인별 알림 · 팁 웹뷰"
priority: medium
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-015-shell-home-onboarding.md
---

## FR

| FR | 내용 | FEATURE-015 |
|---|---|---|
| FR-1 | 하단 4탭(홈 · 저축 · 가계부 · 투자) — `RN-REQ-032` FR-2 | FR-8 |
| FR-2 | 홈 — `HomeSummaryCard[]` 네이티브 렌더, 순서 · 숨김 | FR-2 |
| FR-3 | 온보딩 — 도메인 선택 → 첫 입력 → 끝 | FR-1 |
| FR-4 | 알림 — 도메인별 채널 · 기본 꺼짐 · 푸시 권한은 사용자가 도메인 알림을 켤 때 요청 | FR-4 |
| FR-5 | 금융 팁 · 투자 상세 · 코치 리포트 웹뷰(UA `SALTApp/`) | — |
| FR-6 | 내 데이터 내보내기 · 계정 삭제(스토어 계정 삭제 요구 대응) | FR-3 |

## Acceptance Criteria

- [ ] 첫 실행에 푸시 권한 요청 0
- [ ] 앱 안에서 계정 삭제 가능

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-05 | 금융 팁 S2a(`MONEY-S2a-tips-content`) — **RN 변경 없음.** 웹 팁 zone `/tips` 가 생겼다(공개 · 휴대폰 폭). FR-5 웹뷰 연결은 이 REQ 착수 때 |
| 2026-11-05 | 금융 팁 S2b(`MONEY-S2b-tips-quiz-diff`) — **RN 변경 없음.** 웹 팁 zone 에 퀴즈 칸 · `/tips/cards` 가 생겼다(휴대폰 폭 · 앱 웹뷰 390 확인). FR-5 웹뷰 연결은 이 REQ 착수 때 |
| 2026-11-05 | 금융 팁 S2d(`MONEY-S2d-tips-my-numbers`) — **RN 변경 없음.** 웹 팁 글에 내 숫자 칸(로그인일 때만 · 앱 웹뷰 390 UA 확인). 웹뷰가 세션 쿠키를 싣는지는 FR-5 웹뷰 연결 때 |
| 2026-11-06 | 서버 S3a(`MONEY-S3a-identity-shell`) — 변경 없음(앱 미착수). FR-3 온보딩이 쓸 BFF 계약이 생겼다: `GET /api/app/onboarding` · `PUT /domains` · `POST /finish`(첫 기록 경로는 BFF 값) · 홈 `order` · `hidden` · `PUT /api/app/home/layout` |
