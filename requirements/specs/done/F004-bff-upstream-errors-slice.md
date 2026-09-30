---
id: SLICE-F004-BFF-UPSTREAM-ERRORS
title: "F004 슬라이스 5 — 서버 4xx 전달 · explain 인증 · GET 재시도 (BFF)"
priority: high
labels: [F004, slice, bff, upstream, error, auth, retry]
created: 2026-09-22
---

## Summary

**BFF 가 서버의 4xx 를 전부 500 으로 바꾸고 있었다.** axios 에러가 `AppError` 가 아니라서 error
middleware 가 500 으로 떨어뜨렸다 — 만료 토큰 401 · 검증 실패 400 · 쿨다운 429 가 화면에는 전부
"서버 오류"였다. 코치 리포트 · 재생성 429(`BFF-REQ-023` FR-60)를 올리기 전에 이 바닥을 고친다.

같이 닫는 것: `explain` 을 인증 뒤로(토큰 전달 · 20s · 재시도 0 · 동시 2), 조회 GET 재시도 1회 유틸.

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `BFF-REQ-025` | FR-6 | 서버 4xx(`429` · `422` · `401` …)의 status · `code` · `Retry-After` 보존 |
| `BFF-REQ-023` | FR-60 (BFF 쪽) | 프록시 경로(`/api/ai-coach/generate`)도 `Retry-After` 를 옮긴다 |
| `BFF-REQ-023` | FR-70 · FR-71 · FR-100 | `explain` 을 `authMiddleware` 뒤로, 토큰 전달 |
| `BFF-REQ-025` | FR-1 · FR-2 · FR-5(explain) · FR-7 · FR-10~12 · FR-35 · FR-44 | 20s · 재시도 0 · 동시 2 · 토큰 무해석 · 무로깅 · `renderable:false` 200 |
| `BFF-REQ-025` | 호출 맵 "재시도 1회" | `preview` · `symbolCoach` · `symbolNews` |
| `BFF-REQ-026` | FR-1 (explain 동시 2) | 초과는 대기열 없이 429 |

## 판단 — 리뷰가 볼 곳

1. **4xx 만 보존하고 5xx · timeout 은 그대로 500.** 5xx 를 502/504 로 나눌지는 원인 메시지 노출과
   함께 볼 별도 판단이다. 이번엔 "서버가 이미 준 의미를 지우지 않는다"만 한다.
2. **`explain` 동시 상한은 대기열이 아니라 즉시 거절**(429 `explain_busy`). 한 호출이 20s 를 잡으므로
   줄을 세우면 뒤 요청이 커넥션을 더 오래 잡는다. 상한은 **프로세스 전역**이다(사용자별 아님) —
   목적이 서버 LLM 보호라서. 사용자별 요청 제한은 서버가 이미 한다(분당 10, FR-72).
3. **`explain` 은 BFF 먼저 인증을 켠다**(FR-11). 서버는 아직 공개 경로라 토큰을 무시한다 — 이 순서라야
   서버가 인증을 켤 때 끊기지 않는다. 대가로 **PM 프로토타입(`pm/prototype` `App.jsx:712`)의 무인증 호출이
   401** 이 된다(`BFF-REQ-023` Open Question 이 예고한 것).
4. **재시도는 응답 없음 · 5xx 에만, 취소 · 4xx 에는 안 한다.** 429 를 재시도하면 쿨다운을 스스로 늘린다.
   판단 · 뉴스는 각자 재시도하고 둘이 병렬이다.

## 계약 변경

- **에러 status (프론트 영향)**: `/api/app/**` 에서 서버 4xx 가 500 대신 원 status 로 온다. 본문은
  `{ success:false, code?, message }`. 프론트에 전역 401 처리(자동 로그아웃 등)가 없어 깨지는 화면은
  없고, `useSymbolCoach` 의 "4xx 재시도 안 함" 분기가 이제야 실제로 탄다.
- **`POST /api/app/ai-coach/explain` 이 인증 필수** — 프론트 소비처 0건, PM 프로토타입만 영향.
- 서버 계약 변경 없음.

## 범위 밖

| 항목 | 사유 | 언제 |
|---|---|---|
| `/api/app/coach/report` · `scoreboard` · `generation-status` | **서버에 `/api/coach/detail` · `/scoreboard` · `/generation-status` 가 없다** | F004 서버 후속 → 다음 BFF 슬라이스 |
| `generate` 1s · 202 · 쿨다운 429 | 서버 `generate` 가 아직 동기(LLM 대기) · 쿨다운 없음 · `Retry-After` 를 보내는 서버 코드 0건. 지금 1s 를 걸면 기능이 죽는다 | 서버가 202 · 쿨다운을 낼 때 |
| 서버 5xx → 502/504 구분 | 판단 1 | BFF 에러 정책 정리 시 |
| 나머지 호출 맵(`profile` · `feedback` · `profitPlan` …)의 경로별 타임아웃 · 재시도 | 이 슬라이스는 코치 판단 · 해설 경로만 | 호출 맵을 한 곳(표)으로 옮길 때 |
