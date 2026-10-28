---
id: SRV-REQ-007
spec: ../../specs/in-progress/SRV-REQ-007-ARCH-CLEANUP.md
checklist: ../checklists/SRV-REQ-007.md
title: 서버 정리 — 동면 410 회고
status: 부분 완료
written: 2026-10-27
---

루트 회고: `requirements/reports/retrospects/F000-dormant-410.md`.

## 잘 된 것

- **되살리기 테스트를 실제로 돌렸다** — 수용 기준의 한 줄이 기존 결함(동면 셋이 언제나 500)을 찾았다. 테스트를 안 했으면
  "되살리는 비용이 커밋 하나"라는 REQ 의 전제가 거짓인 채로 남았다

## 아쉬운 것

- 동면 대상 라우터 셋이 `this` 를 잃는 모양인데 **아무도 부르지 않아** 몇 달 동안 드러나지 않았다. 동면 = 호출 0 이라 결함도 0 으로 보인다

## Action

- 되살리는 PR 은 라우터 바인딩부터 고친다(REQ Open Questions)
- 2026-11-03 1주 로그 확인 → FR-14 수용 기준

## FR-11 (2026-10-28)

- FR-11 문장이 ADR-002 전 "2종" 그대로였다 — 닫으면서 고쳤다. Action 없음
