---
id: F000-INTERACTION-MOTION
title: "화면 움직임 — 호버 · 눌림 · 등장 · 스켈레톤 · 숫자 · 막대 · 차트 · 탭 · 페이지 사이를 전 화면 같은 값으로"
created: 2026-11-26
---

## Summary

`FE-REQ-062`(2026-11-04 to-do → 2026-11-26 done). §4-1 우선순위 표의 칸이 다 끝난 뒤 남은 셋(`FE-REQ-062` · `SRV-REQ-049` S4 · HS 삭제 날짜 작업) 중 사용자가 고름.
FE 만 — 서버 · BFF 변경 0.

| 산출물 | 위치 |
|---|---|
| 토큰 | `@repo/tokens` `motion.duration.hover` · `loop` · `easing.standard` · `staggerRow` — 옛 `transitions` 지움 |
| 상태 전환 한 벌 | `@repo/ui/transition` `HOVER_TRANSITION` · 기계 검사 `motionBudget.test.ts` |
| 데스크톱 바닥값 | `@repo/web-shared/layout/globals.css` — 호버 전환 · 버튼 누름 · 목록 행 등장(`:where`, 특이도 0) |
| 막대 · 차트 · 숫자 | `@repo/ui/enterReveal` `growInX` · `growInY` · `chartReveal` · `TradingChart` `engine/reveal.ts` · `@repo/ui/rolledText` |
| 탭 · 페이지 | `FilterTabs` 미끄러짐 · `RouteMain`(같은 zone 안 본문 투명도) |
| 규칙 | `salt-microFe/.claude/rules/motion.md` §3 · §3-1 · 루트 `done-checklist.md` 1절 행 |

## 판단

1. **화면마다 붙이지 않고 바닥값 한 곳** — 전환 없는 링크 372 · 행 그리는 자리 80곳 가까이. 특이도 0 이라 컴포넌트 값 · 휴대폰 규칙이 이긴다
2. **`all` 은 토큰을 지워 막는다** — 180개가 옛 `vars.transitions` 하나에서 왔다. 규칙 문서가 아니라 시험(`motionBudget.test.ts`)
3. **SVG 드러남은 바깥 `clip-path`** — 안쪽 `clipPath` 사각형 `scaleX` 는 매 프레임 레이아웃(트레이스 70 → 248)
4. **카드 등장은 그대로, 행만 새로** — 스펙 측정 표가 카드를 `enterReveal` 에 대응시켰다. 휴대폰과 한 벌
5. **시세 표 필터를 대기 분기 밖으로** — 미끄러짐을 막던 다시 마운트 · 필터 깜빡임(기존 결함)

## 확인

`salt-microFe/requirements/reports/checklists/FE-REQ-062.md` — 15화면 전환 44% → 100% · `all` 180 → 0 · 레이아웃 전환 2 → 0 · 실화면 FR-2~9 · 줄인 모션 · 390 · 트레이스 · 변이 3/3
