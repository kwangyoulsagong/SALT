---
id: FE-REQ-059
area: frontend
kind: UI
title: "F008 해설 카드 — 어느 AI 로 다듬었는지(로컬 Claude · 로컬 Codex · Gemini · 근거 문장만) 한 줄로"
priority: low
created: 2026-11-02
source: salt-server/requirements/specs/to-do/SRV-REQ-050-F008-EXPLAIN-LLM-ROUTING.md
---

## Summary

다듬기 공급자가 요청마다 달라진다(`SRV-REQ-050`). 같은 종목 해설이 날마다 말투가 다른 이유를 사용자가 알 수 있게, 교체 알림 줄에 공급자를 적는다.
새 칸 · 새 배지를 만들지 않는다 — 지금 있는 교체 알림 · 템플릿 안내 문구(`explain-symbol` `EXPLAIN_MESSAGES`)를 공급자별로 고른다.

## FR

| FR | 내용 | 우선 |
|---|---|---|
| FR-1 | `provider` 별 교체 알림: `local_claude` "검사를 통과한 Claude 문장으로 바꿨어요." · `local_codex` "…Codex 문장…" · `gemini` 지금 문구 그대로 · 칸이 없으면(옛 서버) 지금 문구 | Must |
| FR-2 | 템플릿 최종(`provider: null`)은 지금 템플릿 안내 그대로 | Must |
| FR-3 | 공급자 이름은 메시지 상수 한 곳(`messages.ts`) — 컴포넌트에 문자열 0 | Must |
| FR-4 | 스크린리더도 같은 문구(알림 영역 그대로) | Must |
| FR-5 | **흘린 문장(토큰 스트림, `SRV-REQ-050` FR-13)** — 바꾼 것이 아니라 한 문장씩 검사해 보여 준 것: "Claude 문장을 한 문장씩 검사해 보여 드렸어요." (+ "검사에 걸린 문장 N개는 뺐어요."). 공급자는 `polish:active` 단계에서 미리 받는다 — 스트림이 `done` 없이 끊겨도(2026-11-02 실측: 맥 잠자기) 흘린 문장을 "규칙 기반"으로 붙이지 않고 `llm_checked` 로 정산 | Must |

## Acceptance Criteria

체크리스트: `salt-microFe/requirements/reports/checklists/FE-REQ-059.md`

- [x] Playwright route 로 `provider` 셋 · `null` · 칸 없음을 재생 — 문구 다섯 가지 + 끊긴 스트림 1(FR-5)
- [x] `pnpm check-types` · `pnpm lint` · `pnpm --filter web build` · 레이어 훅

## 계약 영향

- `BFF-REQ-050` FR-3(타입) · `FE-REQ-038` FR-7(해설 카드)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-02 | 작성 — `SRV-REQ-050` 짝 |
| 2026-11-02 | 완료 — FR-5 더함(진짜 스트리밍 · 끊긴 스트림 정산). 실스택 화면(임시 사용자, 3100): 흘린 Claude 문장 · 끝 문구 확인 |
| 2026-11-02 | MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`). 파일 2개(경로 이동 내용 무변경 2 · 수정 0 · 추가 0 · 삭제 0). 계약 · 동작 무변경 |
| 2026-11-10 | F017 v2 단계 1(`f7ce96dc`) — 해설 문구 `judgmentBlocked` 삭제(판단이 해설을 막지 않음) |
