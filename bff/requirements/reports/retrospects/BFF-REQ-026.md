# BFF-REQ-026 회고 — F004 성능

- 작성: 2026-09-22 (슬라이스 3 백필 + 슬라이스 5)
- 체크리스트: `requirements/reports/checklists/BFF-REQ-026.md`

## 1. 무엇을 했나

종목 판단 p95 32ms(FR-50) · 모드 전환 무호출(FR-51) · 취소 전파 코드(FR-52), `explain` 동시 2 · 20s(FR-1~3).

## 2. 잘 된 것

- 동시 상한을 **대기열 없이 즉시 거절**로 정했다 — 20s 짜리 호출에 줄을 세우면 커넥션을 더 잡는다. 실측 거절 20ms

## 3. 남은 것

- **upstream 취소를 서버 쪽에서 본 적이 없다**(FR-52 · explain). 코드만 있다
  > **Action:** 해설 버튼이 생기면 화면 이탈 → 서버 로그의 LLM 호출 중단을 확인한다
- 관측(FR-5 · FR-40~45 · FR-54)은 인프라 미정

## 2026-10-29

- 개수를 적은 주석은 칸이 늘 때 같이 낡는다 — 개수 대신 종류로 적었다. Action: 없음

## 2026-10-30 — F004 슬라이스 18 설정 화면

- 변경 없음 · 파일만 걸침. Action: 없음

## F008 해설 공급자 라우팅 · 스트리밍 (2026-11-02) — 회고

없음.

루트 `requirements/specs/done/F008-explain-llm-routing-slice.md` · 영역 `SRV-REQ-050` · `BFF-REQ-050` · `FE-REQ-059`

## 2026-11-02 — MONEY-F1(`FE-REQ-053`)

- 파일만 걸침(경로 · import) — Action 없음


## 2026-11-05 — FE-REQ-013 FR-80 2단계

- 파일만 걸침(토큰 운반이 쿠키로) — Action 없음

## 2026-11-10 — F018

- F018 이 이 REQ 의 파일을 걸쳤다(위 체크리스트 2026-11-10 절). 국내 소유자 전용(F011 §정책)을 전제로 쓴 주석 · 단언이 여러 곳에 흩어져 있었다 — 전제가 바뀌면 그 문장을 grep 으로 한 번에 찾는다

## F017 v2 단계 2 점검 (2026-11-11, `feat/f017-s2-checks-plain-line`)

- 닿은 것: `ai-coach.controller.ts` 에 `tradeCheck` — 요청 취소(abort)를 서버 호출까지 전파. 기존 핸들러 무변경
- 문제 · 액션: 없음 — 주인 REQ 는 `BFF-REQ-052`(FR-3) · 서버 `SRV-REQ-053` · FE `FE-REQ-064`

## F017 v2 단계 3 해설 늘 (2026-11-11, `feat/f017-s3-explain-always`)

- 액션: 없음 — 예산 표의 "코치 대화 첫 토큰"은 대화(F006) 몫으로 남는다

## F017 v2 단계 5 시나리오(`feat/f017-s5-short-direction`) (2026-11-11)

- 문제 없음 — 머리 주석의 주인이라 걸렸다. 새 핸들러의 주인은 `BFF-REQ-052` FR-4

## F017 v4 순서 1a 짝 (2026-11-13)

- 이 REQ 의 기능 변경은 없다 — `ai-coach.routes.ts` 시나리오 줄 주석(누구나 · 지평 넷) — 이 REQ 의 판단 상세 경로 변경 0
- 회고 본문은 루트 `requirements/reports/retrospects/F017-v4-stage1-panel.md`
