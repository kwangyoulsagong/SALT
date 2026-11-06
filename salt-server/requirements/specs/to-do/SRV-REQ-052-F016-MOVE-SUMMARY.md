---
id: SRV-REQ-052
feature: F016
area: server
kind: FUNC
title: "coach — 오늘 등락 한 줄 요약(근거 인용만 · 인과 단정 0 · 설명 3종 게이트 · 스냅샷)"
priority: high
created: 2026-11-06
source: pm/requirements/specs/in-progress/FEATURE-016-why-moved.md
---

## Summary

`FEATURE-016` ③. 서비스 = **coach**(Express — S6 전). 해설 인프라(`SRV-REQ-050` 라우팅 · `FEATURE-008` FR-42~44 숫자 검사 · `languageGuard` · 출처)를 재사용한다.
**판단 해설(explain)과 다른 유스케이스다** — 판단이 아니라 지난 하루의 사실을 묶는다. 결정 `ADR-009`.

## FR

| FR | 내용 |
|---|---|
| FR-1 | `SummarizeDailyMove` — 입력: market 의 분해(`SplitDailyMove`) + 사실 목록(`ListMoveFacts`) — 공개 API 로만(`server-architecture.md` §4). 보유 · 평단 · 금액 0 |
| FR-2 | 고유 몫이 작거나(서버 설정) 사실이 0 이면 **LLM 을 부르지 않고** 서버 문장 "종목만의 뚜렷한 소식은 찾지 못했어요" |
| FR-3 | 프롬프트 규칙: 사실 id 목록 · 분해 숫자 주입 · 한 문장 · 인용 표기 `[n]` 필수 · 인과 단정 · 앞날 · 매매 지시 금지. 응답 검사: 인용 id ⊂ 입력 · 인용 없는 절 제거 · LLM 숫자는 주입값과 대조(다르면 버림) · `languageGuard` 인과어 목록(때문 · 원인 · 덕분 · 탓 · 영향으로 …) |
| FR-4 | **설명 3종 게이트** — 분해 · 인용 ≥1 · AI 생성 표시 문구. 실패 사유 코드(`no_split` · `no_citation` · `guard_blocked` · `disabled`) |
| FR-5 | **스냅샷** — `move_explanation`(종목 · 거래일 · 사실 지문 · 문장 · 인용 · 모델 · 생성 시각). 같은 지문이면 다시 부르지 않음 · 새 사실이 오면 비동기 재생성. 불변 기록(고치지 않고 새 행) — 품질 감사용 |
| FR-6 | 상한 — 기존 24시간 LLM 상한(사용자 · 전체 · 토큰) 공유 · 종목당 하루 재생성 상한 · 비동기 작업(요청 스레드 0) |
| FR-7 | 끄기 — 서버 설정 하나로 ③ 전체 0(①② 는 그대로) |
| FR-8 | 로그 — 프롬프트 · 응답 원문 0 · 게이트 사유 · 지연 · 토큰 수만 |

## Acceptance Criteria

- [ ] 인용 없는 문장 · 입력에 없는 id · 주입값과 다른 숫자 → 버림(경계 표 테스트)
- [ ] 인과어 · 앞날 · 매매 지시 0(가드 테스트 + 표본 grep)
- [ ] 같은 지문 두 번 요청 → LLM 1회
- [ ] 끄기 설정 → ③ 0 · ①② 그대로
- [ ] 평가 표본 충실도 문턱 이상(`FC-REQ-027` · `FEATURE-016` Q2) — 켜기 조건

## 계약 영향

- market `SRV-REQ-051`(공개 API) · DB `DB-REQ-041`(`move_explanation`) · BFF `BFF-REQ-051` · 라우팅 `SRV-REQ-050` 재사용

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-06 | 신규(to-do) — `ADR-009` |
