---
id: BFF-REQ-038
feature: F009
area: bff
kind: API
title: "F009 슬라이스 3 — 거래 기록 · 계획 · 사이즈 계산 · 리스크 예산 뷰모델"
priority: high
created: 2026-09-24
source: pm/requirements/specs/in-progress/FEATURE-009-behavior-risk-coach.md
---

## Summary

서버 슬라이스 1(`SRV-REQ-038`)의 계산 · 저장 API 를 화면 계약으로 옮긴다. **계산하지 않는다** — 서버 Decimal 값을
모양만 검사해 옮긴다. 경로는 전부 `/api/app/coach/*`(인증). 주문 경로가 아니다 — 이미 한 거래를 **적는** 곳이다.

## 결정

1. **거래 + 계획을 한 번에 적는 `POST /trades` 를 BFF 가 조립한다.** 계획은 거래 id 를 들고 만들어져야 연결되고(서버가
   연결 뒤 손절가를 잠근다) 순서가 있다. 성능 규칙 §2 는 의존 호출을 서버 조합 엔드포인트로 올리라고 하지만, 두 호출 모두
   쓰기이고 **거래가 저장되면 성공**이라는 화면 계약(계획 실패는 `plan.status = 'unavailable'` + 계획만 다시 저장)은
   BFF 가 소유하는 게 맞다고 봤다. 서버에 합친 엔드포인트가 생기면 이 조립을 지운다
2. **계획 수량(`plannedQuantity`)은 싣지 않는다.** 폼이 따로 받지 않는데 거래 수량을 넣으면 `size_exceeded` 판정이 늘 거짓이 된다
3. **사이즈 계산은 POST 지만 재시도 0회 · 800ms** — 입력마다 부르고, 느리면 다음 입력이 곧 온다
4. **`orderExecution !== false` 면 계약 깨짐** — 주문 경로가 있다고 말하는 응답은 옮기지 않는다(공통 수용 기준 2)
5. 숫자 자리에 숫자가 아니면 `null`(0 아님), 모르는 게이지 상태는 `insufficient_data`(정상으로 올리지 않음)

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | `POST /api/app/coach/size-check` — 화면 키만 서버로(`symbol · side · quantity · price · stopPrice · winRate · payoffRatio`), 심볼 400. 뷰모델 `SizeCheckView`(`sizingStatus` · 금액 · 비율 · `unavailable` 사유 · `assumptions`). 5xx · 타임아웃 · 계약 깨짐 → 200 `unavailable`, 4xx 그대로 | 완료 |
| FR-2 | `GET · PUT /api/app/coach/risk-budget` — 게이지 3 + 설정. GET 800ms · 재시도 1회, 5xx → `unavailable`. PUT 은 실패를 그대로 올린다(저장 실패를 저장됨처럼 보이지 않게) | 완료 |
| FR-3 | `GET /api/app/coach/plans?symbol=` — 서버 `{ plans }` 를 풀고 깨진 행만 뺀다. `POST /plans` · `PATCH /plans/:id`(uuid 400, 409 잠금 그대로) | 완료 |
| FR-4 | `POST /api/app/coach/trades` — 거래(`/portfolio/transactions`) → 계획(선택, 거래 id 연결). 거래 실패(보유 부족 400 등)는 그대로, 계획 실패는 거래를 두고 `plan.status = 'unavailable'`. 계획 필드가 없으면 서버 1회 | 완료 |
| FR-5 | 거래 응답의 Prisma `Decimal` 문자열을 숫자로 읽는다(표시 전용) | 완료 |
| FR-6 | `GET · PATCH /api/app/ai-coach/profile` 에 `hidePurchasePrice` 통과(없으면 `false`) | 완료 |
| FR-7 | `GET /api/app/coach/mirror` — 서버 `/coach/mirror` 를 모양 검사해 옮긴다(`behavior-mirror.viewmodel.ts`). 서버 `status`(ok · truncated)는 `historyStatus`, 지표 `{value, sampleSize, status}` — 값이 `null` 인데 `ok` 면 `insufficient_data` 로 내린다. 1,500ms · 재시도 1회, 5xx · 타임아웃 · 계약 깨짐 → 200 `unavailable`, 4xx · 취소 그대로. 월간 복기(`/coach/review/monthly`)는 슬라이스 6 | 미러 완료(슬라이스 5) · 복기 to-do |
| FR-8 | `GET /api/app/coach/outcomes?limit=`(1~100, 없으면 서버 기본) · `PUT /api/app/coach/outcomes/:id/tags`(uuid · 문자열 배열 ≤ 8 · 1~20자, 모양만 — 진짜 검증은 서버 zod). 목록은 깨진 행만 뺀다. 확정 실패는 그대로 올린다(저장 실패를 저장됨처럼 보이지 않게) | 완료(슬라이스 5) |
| FR-9 | `POST /api/app/coach/size-check` — 요청 키 `hasPlan` 통과 · 응답 `behavior`(`candidateTags` · `chasingUnknown` · `edgeWarnings`(noEdge 만) · `sellFraming{stopPrice, currentPrice}`). 서버 `null` · `truncated` · 깨진 모양이면 던지지 않고 `null` — 사이즈 결과는 그대로 | 완료(슬라이스 5) |

## 영향

- 프론트: `@repo/core/coach` `tradeRisk.ts` 가 이 뷰모델을 그대로 옮긴다(`FE-REQ-039`)
- 서버: 호출 경로 · 본문 변경 없음 — `SRV-REQ-038` FR-1 · 5 · 6 · 7 과 포트폴리오 `POST /transactions` 를 그대로 쓴다
- 슬라이스 5: `SRV-REQ-038` FR-9e(미러) · 9c(결과 · 태그 확정) · FR-12(size-check `behavior`)를 소비. `@repo/core/coach` `behaviorMirror.ts` 가 FR-7~9 뷰모델을 옮긴다

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-09-24 | 신설 · FR-1~6 구현. 근거 `reports/checklists/BFF-REQ-038.md` |
| 2026-09-27 | 슬라이스 5 FR-7(미러) · FR-8(결과 · 태그 확정) · FR-9(size-check `behavior` · `hasPlan`). 근거 `reports/checklists/BFF-REQ-038.md` §슬라이스 5 |
