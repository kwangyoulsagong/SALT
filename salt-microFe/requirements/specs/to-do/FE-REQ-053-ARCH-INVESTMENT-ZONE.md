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

## Acceptance Criteria

- [ ] 커밋 1 diff 가 rename + import 경로뿐(리뷰어가 `git diff -M` 로 확인)
- [ ] 투자 화면 E2E(목록 · 상세 · 리포트 · 검색) 이동 전후 동일 스크린샷
- [ ] 셸 코드에 `domain-invest` import 0(lint)
- [ ] 가격 깜빡임 0(첫 HTML 에 숫자)

## 계약 영향

- BFF 홈 계약 `BFF-REQ-046`(같은 PR)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
