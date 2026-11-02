---
id: BFF-REQ-050
area: bff
kind: API
title: "F008 해설 스트림 — 요청 클라이언트(web · mobile)를 서버에 알리고 공급자(provider)를 그대로 옮긴다"
priority: medium
created: 2026-11-02
source: salt-server/requirements/specs/to-do/SRV-REQ-050-F008-EXPLAIN-LLM-ROUTING.md
---

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

- [ ] 앱 UA 요청 → 서버가 받은 헤더 `mobile` · 데스크톱 브라우저 → `web` · 클라이언트가 위조한 헤더는 덮어쓴다
- [ ] 서버 `provider` 가 화면까지 그대로(중계 테스트)
- [ ] `npm run build` · `npm test`

## 계약 영향

- `SRV-REQ-050` · `FE-REQ-059` · `BFF-REQ-037`(해설 스트림 중계)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-02 | 작성 — `SRV-REQ-050` 짝 |
