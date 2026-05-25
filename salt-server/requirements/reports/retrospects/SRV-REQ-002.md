---
id: SRV-REQ-002
spec: ../../specs/done/SRV-REQ-002.md
checklist: ../checklists/SRV-REQ-002.md
title: Investment Coach Server > 외부 주문 전 체크 회고
completed: 2026-05-25
---

## 요약

외부 주문 전 손절, 손익비, 비중 한도, 가격 최신성 체크를 계산하는 API를 구현했다.

## 잘된 점

- Zod DTO로 입력값의 가격/금액 양수 조건과 mode enum을 제한했다.
- 사용자 portfolio/profile/market 데이터를 함께 조회해 비중과 데이터 최신성을 계산한다.
- `orderExecution: false`를 응답에 고정해 주문 실행 기능과 분리했다.

## 어려웠던 점 / 시행착오

- 전체 server build는 기존 타입 오류로 실패했다.
- Prisma generate는 `DATABASE_URL` 미설정으로 실패했다.

## 개선 / 다음에는

- checklist severity를 서버와 BFF 중 어느 레이어가 소유할지 확정하면 중복 변환을 줄일 수 있다.
- stop/take-profit 기준을 사용자 profile과 연동하는 후속 REQ가 필요하다.

## 검증 산출

```text
npm run prisma:generate # FAIL: DATABASE_URL missing
npm run build           # FAIL: existing type errors outside this module path
```

## Quality Score

| 항목 | 점수 (1-5) |
|---|---|
| API 계약 준수 | 5/5 |
| 모듈 구조 | 5/5 |
| 타입 안전성 | 4/5 |
| 리스크 계산 완성도 | 5/5 |
| 검증 통과도 | 2/5 |
