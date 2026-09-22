# BFF-REQ-023 회고 — F004 조립 로직

- 작성: 2026-09-22 (슬라이스 3 백필 + 슬라이스 5)
- 체크리스트: `requirements/reports/checklists/BFF-REQ-023.md`
- 근거: 루트 `requirements/reports/retrospects/F004-bff-symbol-judgment.md` · `F004-bff-upstream-errors.md`

## 1. 무엇을 했나

종목 판단 경로(FR-90~104, 슬라이스 3)와 `explain` 인증(FR-70~72 · FR-100, 슬라이스 5)을 닫았다.
코치 리포트(FR-10~14) · 성적표 그룹 · 익절 · 행동 기록 · 피드백 `reasonCode` · `generation-status` 는 남았다.

## 2. 잘 된 것

- **게이트는 전달만** — 두 슬라이스 모두 BFF 가 `renderable` 을 만드는 경로가 없다
- FR-60 의 선행 조건(4xx → 500 변환)을 먼저 찾아 고쳤다. 429 를 전달하는 코드를 짜기 전에 바닥이 깨져 있었다

## 3. 틀렸던 것

- **남은 절 대부분이 서버를 기다린다.** REQ 는 "기존 라우트에 필드 추가"로 적었지만 서버에
  `/api/coach/detail` · `generation-status` · 쿨다운이 없다. 계획 단계에서 서버 엔드포인트 존재를 먼저 봤어야 했다
  > **Action:** 이 REQ 의 남은 FR 은 `SRV-REQ-025` 해당 절이 닫힌 뒤 착수한다
