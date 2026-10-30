---
id: FE-REQ-054
feature: F015
area: frontend
kind: UI
title: "F2 — AppChrome(하단 탭 · 헤더 · 데스크톱 왼쪽 내비) + zone 이동 완화(prerender · 문서 간 전환)"
priority: high
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-015-shell-home-onboarding.md
---

## Summary

zone 이 5개면 하단 탭이 가장 잦은 zone 간 이동이다. 크롬을 한 컴포넌트로 만들고, 이동을 미리 렌더 · 문서 간 전환으로 가린다(`ADR-005` §3).

## FR

| FR | 내용 | FEATURE-015 |
|---|---|---|
| FR-1 | `@repo/ui` `AppChrome` — 탭 4개(홈 · 저축 · 가계부 · 투자), 금융 팁은 탭 아님. 데스크톱(1024+)은 왼쪽 내비 4항목 — `FE-REQ-047` 헤더 · 패널 위계와 맞춤 | FR-8 |
| FR-2 | 탭 링크는 `CrossZoneLink`. 현재 zone 판정은 레지스트리 | FR-8 |
| FR-3 | Speculation Rules — `<script type="speculationrules">` prerender, `eagerness: moderate`, 대상은 탭 4개 첫 화면만. 로그아웃 상태에서는 끔 | FR-8 |
| FR-4 | 모든 zone CSS 에 `@view-transition { navigation: auto; }` · 탭 · 헤더에 같은 `view-transition-name`. `prefers-reduced-motion` 이면 전환 없음 | FR-8 |
| FR-5 | 공용 청크 같은 해시 — zone 별 Next 설정을 공용 프리셋 하나에서(`packages/config-next`) | — |
| FR-6 | 계측 — zone 간 전환 시간 · prerender 적중률(브라우저별) | NFR 관측성 |
| FR-7 | 도메인 색 토큰 추가(기존 색 변경 0 — 기존 UI 결정 존중) | FR-7 |

## Acceptance Criteria

- [ ] Chromium 에서 탭 이동 시 prerender 적중(DevTools 기록)
- [ ] Safari 에서 일반 이동 · 깨짐 0
- [ ] 크롬이 전환 중 깜빡이지 않음(녹화)
- [ ] reduced-motion 에서 전환 0
- [ ] 기존 토큰 값 diff 0

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
