---
id: SLICE-F004-BFF-COACH-REPORT
title: "F004 슬라이스 14 — BFF 코치 리포트 · 생성 상태 · 재생성 202/429 전달"
priority: high
labels: [F004, slice, bff, contract, render-gate]
created: 2026-09-23
---

## Summary

서버 슬라이스 12 · 13 이 연 계약을 화면 쪽으로 잇는다. BFF 가 코치 리포트 뷰모델을 소유하고
(`/api/app/coach/report`), 생성 상태를 옮기고(`/api/app/coach/generation-status`), 재생성 202 · 쿨다운 429 를
**본문까지** 전달한다. 서버 두 슬라이스에 남아 있던 "인증 HTTP 미검증"이 여기서 BFF 경유 실측으로 닫혔다.

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `BFF-REQ-023` | FR-1~6 · 10~14 · 30~32 · 40 · 41 · 60~63 | 게이트 전달 · 리포트 조립 · 익절 · 행동 기록 · 재생성 · 생성 상태 |
| `BFF-REQ-025` | FR-3 · 4 · 6 | `generate` 1s · 202 · 4xx 보존 |

## 판단 — 리뷰가 볼 곳

1. **막힌 추천은 종목까지 떨군다** — 판별 union 의 `false` 쪽에는 사유와 표본 수만 있다. 리포트의 추천에서는
   종목이 추천 내용이다(종목 판단의 막힌 모드가 종목을 남기는 것과 다른 이유)
2. **4xx 는 `unavailable` 로 삼키지 않는다** — 401 이 200 이 되면 프론트 토큰 갱신이 돌지 않는다.
   5xx · 타임아웃 · 계약 깨짐만 200 `{ status: unavailable }`
3. **`degradedFields` = 계약이 깨진 필드** — 서버의 `recommendation: null` 은 추천 없음이지 결측이 아니다(FR-11 해석)
4. **에러 미들웨어가 `retryAfterSeconds` 를 떨구고 있었다** — 규칙 문서 `backend-integration.md` 의 필드 목록도 고쳤다(별도 커밋)

## 커밋

- `21704c6` feat(bff) — 기존 경로: 429 본문 · `generate` 1s · 행동 기록 코드 · profile 옛 필드 제거
- `c00d6a9` feat(bff) — 신규: 리포트 뷰모델 · 서비스 · 라우트 · 생성 상태
- `9045d81` docs(bff-rules) — 4xx 보존 필드 목록

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FE 코치 리포트 화면 | 이 계약 위의 작업 | `FE-REQ-026` M절 |
| 성적표 그룹 BFF(`scoreboard` · FR-20~24 · 103) | 추천 근거 상세 FE 와 같이 | 다음 BFF · FE 슬라이스 |
| 피드백 `reasonCode` · preflight `stopLossRate` BFF | 주문 전 체크 FE 와 같이 | 다음 슬라이스 |
| 추천이 채워진 리포트 실측 | 로그인 가능한 로컬 계정에 보유가 없다 | 테스트 계정 보유 기록 후 |
