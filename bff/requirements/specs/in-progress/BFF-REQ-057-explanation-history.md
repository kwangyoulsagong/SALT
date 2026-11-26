---
id: BFF-REQ-057
feature: F017
area: bff
kind: API
title: "지난 날 해설 — `GET /api/app/ai-coach/explanation/history`"
priority: high
created: 2026-11-26
status: in-progress
source: "사용자 2026-11-26 \"AI 해설 오늘 것만 나오는데 전 후도 보고 싶어 — 어제 폭락 · 오늘 반등, 오늘 판정을 어제와 견주고 싶다\" · 짝 `SRV-REQ-063` · `FE-REQ-079`"
---

## 목적

해설은 그날 쓴 글이다. 지난 날 해설을 **그날 원문 그대로** 다시 보게 하고, 그날 판정 옆에 그날 · 그 뒤 실제 등락(서버 일봉 계산)을 나란히 둔다.
지금 데이터로 다시 쓰지 않는다(사후 지식 0) · 빗나간 날도 같은 모양으로(골라 보여 주기 0 — 2024-08 자본시장법 개정의 유사투자자문 표시 · 광고 금지와 같은 선).

## FR

| FR | 내용 |
|---|---|
| FR-1 | `GET /api/app/ai-coach/explanation/history?symbol&mode[&days]` → 서버 `/api/ai-coach/explanation/history` 중계. `symbol` 형식 · `mode`(scalp · long_term) · `days`(1~14) 검사는 BFF 400 |
| FR-2 | 뷰모델 `toExplanationHistoryViewModel`(순수) — 문장은 `toExplanationSentence` 그대로(인용 `http(s)` 만) · 성적 · 틀렸던 때 칸(`track` · `miss`)은 지금 값이라 뺀다 · 등락률은 숫자 또는 `null`(0 으로 접지 않는다) |
| FR-3 | 모양이 깨지면 502 `explanation_history_unavailable` — 문장을 지어내지 않는다. 빈 `days` 는 정상 |
| FR-4 | 예산 400ms(패널과 같다) · 조회라 1회 재시도 · 화면이 떠나면 서버 호출도 끊는다(AbortSignal) |
| FR-5 | 옛 `/api/app/ai-coach/explanation`(은퇴 410)과 겹치지 않는다 — 코치 라우터가 은퇴 미들웨어보다 먼저라 하위 경로는 라우터가 받는다 |

## 수용 기준

- 시험: 원문 · 판정 · 등락률 그대로 · `track` 뺌 · 빈 목록 정상 · `null` 유지 · 깨진 모양 6가지 계약 오류
- `npm run build` · `npm test` 통과

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-26 | 신규(`feat/ai-commentary-history`) — 경로 · 뷰모델 · 시험 9. 서버 짝 `SRV-REQ-063` · 화면 `FE-REQ-079` · 루트 `F017-explanation-days-slice.md` |
