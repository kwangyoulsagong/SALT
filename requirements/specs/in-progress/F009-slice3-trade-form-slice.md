---
id: SLICE-F009-3-TRADE-FORM
title: "F009 슬라이스 3 — 거래 기록 폼 · 계획 · 사이즈 결과 · 내 계획 · 리스크 게이지 (BFF · FE)"
priority: high
labels: [F009, slice, bff, fe, contract]
created: 2026-09-24
---

## Summary

사용자가 처음 쓰는 슬라이스. 종목 상세에서 이미 한 거래를 적고(수동 입력) 손절가 · 이유를 붙이면, 그 크기가 내 손실 예산에서
얼마인지 서버 숫자로 본다. 코치 리포트에서 이번 달 손실 · 집중도 · 회전율을 내 기준과 나란히 본다. 새 화면 0개.

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| BFF | `bff/requirements/specs/in-progress/BFF-REQ-038-F009-TRADE-RISK.md` | FR-1~6 (미러 · 복기 FR-7 은 슬라이스 4 · 6) |
| 프론트 | `salt-microFe/requirements/specs/in-progress/FE-REQ-039-F009-TRADE-RISK.md` | FR-1~12 (매입가 숨김 FR-13 보류) |
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-038-F009-RISK.md` | 변경 없음 — FR-1 · 5 · 6 · 7 을 그대로 쓴다 |

## 판단 — 리뷰가 볼 곳

1. **게이지 자리를 코치 리포트로** — 기획서는 포지션 화면이지만 웹에 없다. 새 화면을 만들지 않는 조건이 먼저다
2. **거래 + 계획을 BFF 가 조립(`POST /api/app/coach/trades`)** — 거래가 저장되면 성공, 계획 실패는 "계획만 다시 저장"
3. **손절 % 프리셋을 뺐다** — 가격 × 비율은 프론트 금액 계산(`fsd-features.md` "예외는 없다")
4. **`@repo/ui` 에 `DisclosureSlot`(세 줄 튜플 필수) · `TextField` `compact`** — 고지는 끌 수 없고, 문구는 앱이 갖는다
5. **FSD 레지스트리에 `set-risk-budget` 추가**(`.claude/rules/fsd-features.md` · `layer-rules.cjs`)

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 준수 판정 · 미러 · 태그 | 슬라이스 4 · 5 | `SRV-REQ-038` FR-9 · `FE-REQ-039` 후속 |
| 월간 복기 · 코치 대화 3문항 · 시나리오 | 슬라이스 6 | `SRV-REQ-038` FR-10 |
| 매입가 숨김 화면 | 평단을 보이는 웹 화면이 없다 | 포지션 화면 |
