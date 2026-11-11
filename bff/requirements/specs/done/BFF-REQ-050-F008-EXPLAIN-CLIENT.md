---
id: BFF-REQ-050
area: bff
kind: API
title: "F008 해설 스트림 — 요청 클라이언트(web · mobile)를 서버에 알리고 공급자(provider)를 그대로 옮긴다"
priority: medium
created: 2026-11-02
source: salt-server/requirements/specs/to-do/SRV-REQ-050-F008-EXPLAIN-LLM-ROUTING.md
---

> **정정 2026-11-11 — 해설 스트림 은퇴**(F017 v2 단계 3, `feat/f017-s3-explain-always`). 해설은 배치가 미리 만든 것을 읽는다 — `GET /api/app/ai-coach/explanation`(4단, `BFF-REQ-052` FR-2 · `SRV-REQ-053` FR-3 · `FE-REQ-064` FR-2). 아래 `POST …/explain` · `…/explain/stream` 과 그 중계 · 화면은 지웠다(소비처가 같은 PR 에서 옮겨 감 — 제거 = 404). 기록으로 둔다.

## Summary

서버가 해설 다듬기 공급자를 고를 때 "모바일이면 Gemini"(`SRV-REQ-050` FR-4)를 알려면 요청이 어디서 왔는지가 필요하다. 그 판단은 BFF 가 이미 한다
(앱 웹뷰 UA `SALTApp/` · RN 클라이언트). BFF 가 **헤더 하나로** 넘기고, 서버가 스트림에 더한 `provider` 칸은 이름 허용 목록 중계 그대로 지난다.

## FR

| FR | 내용 | 우선 |
|---|---|---|
| FR-1 | `POST /api/app/ai-coach/explain/stream` · 단건 해설 요청을 서버로 보낼 때 `X-Salt-Client: web | mobile` — UA 에 `SALTApp/` 이 있거나 RN 클라이언트 헤더면 `mobile`, 아니면 `web`. 클라이언트가 보낸 `X-Salt-Client` 는 **버리고 BFF 가 정한 값만**(사용자가 헤더로 공급자를 고르지 못하게) | Must |
| FR-2 | 스트림 이벤트 데이터의 `provider` 칸(`message.replace` · `message.done`)은 그대로 통과 — 이벤트 이름 허용 목록 중계라 코드 변경 없음을 테스트로 고정 | Must |
| FR-3 | `@repo/core` `ExplainStreamEvent` 타입에 `provider?: "local_claude" | "local_codex" | "gemini" | null` 추가(뷰모델 소유권 — `bff-architecture.md` §3) | Must |

## Acceptance Criteria

체크리스트: `bff/requirements/reports/checklists/BFF-REQ-050.md`

- [x] 앱 UA 요청 → 서버가 받은 헤더 `mobile` · 데스크톱 브라우저 → `web` · 클라이언트가 위조한 헤더는 덮어쓴다 — BFF 는 들어온 헤더를 넘기지 않고 `explainClientOf(UA)` 값만 싣는다(`client-kind.util`)
- [x] 서버 `provider` 가 화면까지 그대로(중계 테스트 — `replace` · `done` 데이터 원문 그대로)
- [x] `npm run build` · `npm test` 302 / 0

## 계약 영향

- `SRV-REQ-050` · `FE-REQ-059` · `BFF-REQ-037`(해설 스트림 중계)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-02 | 작성 — `SRV-REQ-050` 짝 |
| 2026-11-02 | 완료 — UA 판별은 BFF 유틸(`@repo/core` `isAppWebView` 와 같은 정규식, BFF 는 core 를 import 하지 않는다). FR-3 타입은 `@repo/core/coach` `ExplainProvider` · `message.step.provider`(스트림 시작에 공급자, `SRV-REQ-050` FR-13) |
| 2026-11-03 | S0(`feat/srv-req-043-s0-platform`, 루트 `MONEY-S0-platform-slice.md`) — `proxyAuthRequest` 의 `headers`(BFF 가 정한 것만)에 BFF 가 만든 `traceparent` 가 하나 더 실린다(`BFF-REQ-045` FR-7). 해설 공급자 헤더 동작 무변경 |
| 2026-11-03 | 커밋 대조 — 걸친 파일 `backend-api.service.ts`: `4bc746f1`(인터셉터) · `cc184c3a`(녹화 주소 · 그림자 상한) |
| 2026-11-11 | `X-Salt-Client` 헤더 **은퇴** — 해설이 요청 경로에서 빠져 공급자를 요청마다 고를 일이 없다(배치는 공용 문장 하나 — `SRV-REQ-050` 배치 표지). `client-kind.util` 삭제 — F017 v2 단계 3(`feat/f017-s3-explain-always`) |
