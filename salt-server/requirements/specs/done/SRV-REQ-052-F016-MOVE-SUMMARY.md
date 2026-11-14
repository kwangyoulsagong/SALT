---
id: SRV-REQ-052
feature: F016
area: server
kind: FUNC
title: "coach — 오늘 등락 한 줄 요약(근거 인용만 · 인과 단정 0 · 설명 3종 게이트 · 스냅샷)"
priority: high
created: 2026-11-06
status: done
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

## 진행 — 단계 D done(2026-11-12)

| FR | 상태 | 구현 |
|---|---|---|
| FR-1 | done | 배치 `GenerateMoveSummaries`(카드 재료 = market 공개 API `whyMovedCard` — 화면 경로와 같은 유스케이스) · 읽기 `GetMoveSummary` · `GET /api/ai-coach/move-summary`(시장 경로와 같은 읽는 사람 — 게스트 포함) |
| FR-2 | done | `moveQuietReason` — 사실 0 또는 고유 몫 < 1%p · < 등락의 30%(벤치마크는 등락 전체). 서버 문장, LLM 0 · **저장하지 않고 요청 때 같은 규칙** |
| FR-3 | done | 프롬프트 `moveSummaryPrompt.ts` — 번호 사실 · 몫은 말로만("무엇이 가장 컸나"). 검사 `verifyMoveSummary` — 인용 ⊂ 입력 · 인용 없는 문장 버림 · 원인 단정(해설보다 엄함 — 근거 숫자가 있어도) · 앞날 · 공용 말투 검사 · **숫자는 인용한 사실 글에 있는 것만**(분해 숫자 포함 버림) · 120자 |
| FR-4 | done | `selectMoveSummary` — 분해 · 인용 ≥1 · AI 표시(`label: ai`). 사유 `no_split` · `no_card` · `no_citation` · `guard_blocked` · `disabled` · `pending` · `quiet` |
| FR-5 | done | `move_explanation`(`DB-REQ-041` FR-8) — 실패 시도도 행(같은 지문 LLM 1회). 지문 = 버전 · 자산 · 종목 · 거래일 · 사실 id(최신 12). 읽기는 성공본 인용이 지금 사실에 다 있으면 보임 |
| FR-6 | done | 24시간 LLM 상한 공유 + **해설 배치가 끝 30회를 남김**(`LLM_RESERVED_CALLS` — 실측 해설이 300 을 다 써 한 줄이 굶었다) · 종목 · 거래일당 ~~4~~ **8**회 · **보이는 성공본이 있으면 60분 간격**(확인 2회차) · 회차 6 · 해설 배치 뒤 같은 LLM 워커(순서대로) · 로컬 CLI 상태는 해설과 한 `LocalCliGate` |
| FR-7 | done | `MOVE_SUMMARY=off`(해설 LLM 을 끄면 같이 꺼짐) — 배치 0 · 읽기 `disabled` · ①② 그대로 |
| FR-8 | done | 로그는 개수 · 사유 코드만 · 사용량 원장 `purpose: move_summary` · 원문 0 · `ops/salt.sh status` 줄(통과 · 검사 막음 · LLM 실패 — 확인 2회차) |

- 실측(2026-11-12 13:3x, 국내 카드 날 3종목): 로컬 Claude 3건 전부 통과 · 인용 2~4 · 읽기 24~66ms · BFF 경유 54~159ms. 리포트 `salt-forecast/reports/move-explain-2026-11-12.md`
- 루트 `requirements/specs/done/F016-D-move-summary-slice.md`

## Acceptance Criteria

- [x] 인용 없는 문장 · 입력에 없는 id · 주입값과 다른 숫자 → 버림(경계 표 테스트 `moveSummary.test.ts`)
- [x] 인과어 · 앞날 · 매매 지시 0(가드 테스트 + 실문장 3건)
- [x] 같은 지문 두 번 요청 → LLM 1회(`moveSummaries.test.ts`)
- [x] 끄기 설정 → ③ 0 · ①② 그대로
- [x] ~~평가 표본 충실도 문턱 이상 — 켜기 조건~~ (대체 기준 충족 2026-11-12 — 주간 운영 리포트 `move-explain-*.md` · 끄기 `MOVE_SUMMARY=off`) **2026-11-06 사용자 결정**: 켜기 조건 아님 — 운영 중 충실도 리포트(`FC-REQ-027`) · 나빠지면 FR-7 끄기

## 계약 영향

- market `SRV-REQ-051`(공개 API) · DB `DB-REQ-041`(`move_explanation`) · BFF `BFF-REQ-051` · 라우팅 `SRV-REQ-050` 재사용

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-06 | 신규(to-do) — `ADR-009` |
| 2026-11-06 | 사용자 결정 — ③ 평가 문턱 없이 켬(비상업 · 본인 + 친구용). 게이트 · 가드 · AI 표시 유지 |
| 2026-11-12 | **done** — 단계 D. FR-1~8. 정정: 조용한 날 문장은 저장하지 않는다(요청 때 같은 규칙) · 문장에 분해 숫자를 넣지 않는다(숫자는 인용한 사실 글의 것만) · LLM 상한에 한 줄 몫 30 예약 |
| 2026-11-12 | 확인 2회차 — 결함 다섯 고침: 프로그램 사실 id(`SRV-REQ-051`) · FR-5/6 정정 **보이는 성공본 60분 간격 · 하루 상한 8**(4 였다) · 로컬 CLI 상태를 해설과 한 게이트로 · FR-8 `salt.sh status` 줄 · FE AI 표시 대비 |
| 2026-11-14 | 한 줄 배치가 뒤에 도는 사실 추출 몫(60)을 남긴다(`reservedCallsBehind("moveSummary")`, F017 v4 2c) — 한 줄은 240 에서 멈춤 · 경계 시험 더함 |
