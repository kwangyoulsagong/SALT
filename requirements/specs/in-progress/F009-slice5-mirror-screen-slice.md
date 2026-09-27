---
id: SLICE-F009-5-MIRROR-SCREEN
title: "F009 슬라이스 5 — 내 거래 미러 화면 · 태그 확정 · 폼 한 줄 · 행동 알림을 측정으로"
priority: high
labels: [F009, slice, server, bff, fe, contract]
created: 2026-09-27
---

## Summary

슬라이스 4 가 쌓은 숫자를 사용자가 본다. 코치 리포트 안 "내 거래 미러" 섹션 · 청산별 태그 확정, 거래 폼 아래 엣지 없음 한 줄(매수)과
"오늘 처음 본다면" + 계획 손절 vs 지금(매도). 막지 않는다 — 모두 정보다. 과매매 · 패닉 · 추격 알림은 저장 · 알림을 끄고 미러의 "최근 행동" 줄이 됐다.

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-038-F009-RISK.md` | FR-12(size-check `behavior`) · FR-13(행동 측정) |
| BFF | `bff/requirements/specs/in-progress/BFF-REQ-038-F009-TRADE-RISK.md` | FR-7(미러) · FR-8(결과 · 태그 확정) · FR-9(size-check `behavior` · `hasPlan`) |
| 프론트 | `salt-microFe/requirements/specs/in-progress/FE-REQ-039-F009-TRADE-RISK.md` | FR-14~20 |
| DB | `DB-REQ-031` | 변경 없음 — 마이그레이션 0 |

## 사용자 결정 (2026-09-27)

- 폼 한 줄 · 매도 프레이밍에 필요한 서버 값을 이번에 같이 만든다(서버 포함)
- 행동 알림(FR-21)은 미러가 화면에 나오는 이 슬라이스에서 끈다
- 추격 판정은 거래 입력 시점에 저장하지 않는다 — 지금처럼 배치(30일 지난 매수는 직전 판정을 잇는 한계를 남긴다)

## 판단 — 리뷰가 볼 곳

1. **미리보기가 배치와 같은 규칙인가** — 가상의 매수 한 건을 장부 끝에 붙여 `replayLedger` 를 다시 돌린다(`domain/policy/tradePreview.ts`). 규칙 한 벌
2. **미리보기를 size-check 에 붙인 선택** — 경로 하나 · BFF 한 번이지만 입력마다 거래 전체를 읽는다. 실패는 유스케이스 안에서 `null` 로 격리. p95 는 로그인 QA 에서 재고, 넘으면 떼어 낸다
3. **행동 알림 끄기 = 저장 행의 소비처 셋을 옮기는 일** — 코치 상세 · 행동 코치 · 추천 점수 감점이 요청 때 판정(`BehaviorAnalyzer` 포트)을 본다. 쓰기 경로(`saveBehavior` · `findActiveBehavior`)는 지웠다
4. **매도 프레이밍에서 뺀 것** — 매입가 · 손익률(미래를 보게), "보유 대비" 조각(종목 단위 값이 서버에 없다)
5. **계약을 먼저** — `@repo/core/coach` `behaviorMirror.ts` 를 먼저 쓰고 BFF · 프론트를 병렬로. BFF 는 그 모양만 만든다

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 월간 복기 · Brier · IPS 3문항 · 시나리오 | 다음 슬라이스 | 슬라이스 6(`SRV-REQ-038` FR-10) |
| 연승/연패(FR-20) · 시간대(FR-22) | Could | 슬라이스 6 이후 |
| 준수 라벨 수정 화면 | API 만 있다(`PATCH /plans/:id` `userAdherenceLabel`) — 이번엔 태그 확정만 | 사용 기록에서 라벨 오판 신호가 오면 |
| 사용자 정의 태그 새로 적기 | 추가 입력 2개 이내 | 5종으로 부족하다는 신호가 오면 |
