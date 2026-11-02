---
id: SRV-REQ-050
area: server
kind: FUNC
title: "F008 해설 다듬기 라우팅 — 로컬 CLI(Claude Code · Codex)가 있는 사용자는 그것으로, 없거나 모바일이면 지금처럼 Gemini"
priority: medium
created: 2026-11-02
source: 사용자 결정 2026-11-02 "로컬 llm 이 있는 사람은 터미널로 claude 나 코덱스로 하고 없거나 모바일이면 제미나이 지금으로" · pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md FR-45 · FR-69
---

## Summary

해설은 템플릿이 바닥이고 LLM 은 **다듬기 계층**이다(FEATURE-008 FR-45). 지금 다듬기는 Gemini 하나다. 이 REQ 는 다듬기 공급자를
**요청마다 고른다** — 서버 맥에 로컬 CLI(Claude Code `claude` · OpenAI Codex `codex`)가 있고 그 사용자가 허용 목록에 있고 데스크톱 웹 요청이면
로컬 CLI, 아니면(로컬 CLI 없음 · 허용 밖 · 모바일 앱 요청) **지금처럼 Gemini**.

**왜** — 2026-11-02 블라인드 A/B(독립 평가자 3, 다수결 2회 모두 템플릿 20/20)에서 Gemini(`gemini-2.5-flash-lite` 무료 등급)는
완곡 권유("분할 매수를 고려해볼 만합니다") · 가격 목표 인용 · 입력에 없는 지표 해석을 반복했고, 같은 날 무료 할당량이 바닥나(429) 그 뒤 해설이
전부 템플릿이 됐다. 사용자는 소유자 맥에 구독 CLI 가 있다 — 더 큰 모델을 추가 비용 없이 쓸 수 있다. 근거: `SRV-REQ-037` FR-15 · `salt-server/requirements/reports/explain-ab/`.

바뀌지 않는 것: 템플릿 먼저 흘리기(FR-47) · **어느 공급자든 같은 검증기**(숫자 · 금지어 · 명령형 · 완곡 권유 · 목표가 · 극성) · LLM 원문 무스트림 ·
프롬프트에 보유 수량 · 평단 · 원화 손익 0(FR-46) · 비용 상한(`SRV-REQ-025` FR-62).

## 착수 전 네 질문 (`msa-services.md` §1)

| 질문 | 답 |
|---|---|
| 어느 서비스 | `coach` — S6 전이라 Express(`coach/infrastructure`). S6 이전 때 `CoachExplainer` 포트 뒤 그대로 옮긴다(`SRV-REQ-049` FR-4) |
| 어느 단계 | Express. DDL 은 사용량 원장 `provider` 값 확장뿐(FR-9) |
| 테이블 주인 | LLM 사용량 원장 = coach |
| BFF 계약 | 요청 헤더 `X-Salt-Client` 추가(`BFF-REQ-050`) · 스트림 `message.replace` / `message.done` 에 `provider` 칸 추가(추가만) |

## FR

| FR | 내용 | 우선 |
|---|---|---|
| FR-1 | **공급자 셋 + 없음** — `local_claude`(Claude Code CLI) · `local_codex`(Codex CLI) · `gemini`(지금 것) · 없으면 템플릿만. 모두 `CoachExplainer` 포트 구현이고 `ExplainCoachDecision` 은 어느 것인지 모른다(라우터 하나가 고른다) | Must |
| FR-2 | **로컬 CLI 감지는 부팅 때 한 번** — env `COACH_LLM_LOCAL=auto|claude|codex|off`(기본 `auto`). `auto` 는 PATH 에서 `claude` → `codex` 순으로 찾고 `--version` 이 5초 안에 0 으로 끝나면 사용 가능. 결과를 기동 로그 한 줄로(버전 · 경로 — 계정 · 토큰 0). 요청마다 찾지 않는다 | Must |
| FR-3 | **요청마다 고르기** — ① 로컬 CLI 사용 가능 ② 요청자 이메일이 `COACH_LLM_LOCAL_USERS`(쉼표, 비우면 `FORECAST_OWNER_EMAILS` — 소유자 구독을 다른 초대 사용자가 쓰지 않게) 안 ③ 요청 클라이언트가 `web`(BFF 헤더 `X-Salt-Client`, 없으면 `web`) → 셋 다면 로컬 CLI, 아니면 Gemini. `COACH_EXPLAIN_LLM=off`(`SRV-REQ-037` FR-16)면 공급자 없이 템플릿만 | Must |
| FR-4 | **모바일은 Gemini** — `X-Salt-Client: mobile`(RN 앱 · 앱 웹뷰 UA `SALTApp/`)이면 로컬 CLI 를 고르지 않는다(사용자 결정). 사유를 코드 주석 · 이 표에: 로컬 CLI 첫 응답이 수 초 더 길고(프로세스 기동), 모바일은 백그라운드 전환으로 스트림이 자주 끊겨 기동 비용만 버린다(`streaming-sse.md` §9) | Must |
| FR-5 | **CLI 호출 격리** — ① 프롬프트는 **stdin** 으로(argv 금지 — 프로세스 목록에 남는다) ② 도구 0: Claude `-p --output-format json` + 모든 도구 비허용, Codex `exec --sandbox read-only --skip-git-repo-check --json` ③ 작업 디렉터리는 요청마다 만든 빈 임시 폴더(저장소 · 홈 아님), 끝나면 지운다 ④ env 는 PATH · HOME · 언어만 넘긴다(서버 비밀 · DB URL 0) ⑤ 출력은 기존 JSON 스키마(`explanationPrompt.ts` 응답 모양)로만 파싱 — 다르면 실패 | Must |
| FR-6 | **시간 · 동시성 상한** — CLI 한 번 45초(템플릿이 이미 흐르고 있어 기다림이 화면을 막지 않는다) · 서버 전체 동시 CLI 2개(넘으면 그 요청은 Gemini). 요청이 끊기면(`signal`) 자식 프로세스를 `SIGTERM` → 3초 뒤 `SIGKILL`. 고아 프로세스 0 | Must |
| FR-7 | **실패하면 한 단계 아래로** — 로컬 CLI 실패 · 시간 초과 · 스키마 불일치 → 같은 요청을 Gemini 로 한 번 → 그것도 실패면 템플릿(지금 동작). 다음 요청은 다시 FR-3 로 고른다. 로컬 CLI 가 연속 3번 실패하면 10분 동안 고르지 않는다(로그 한 줄) | Must |
| FR-8 | **같은 검증기** — 공급자와 무관하게 `verifyExplanation`. 공급자별 버린 문장 수를 사용량 원장에 남긴다(FR-9) — 공급자 비교의 근거 | Must |
| FR-9 | **사용량 원장 `provider`** — `gemini` · `local_claude` · `local_codex`. 로컬 CLI 는 토큰 비용 0 이지만 시도 · 지연 · 실패 · 버린 문장 수는 남긴다. 비용 상한(FR-62)의 전체 토큰 상한은 `gemini` 만 센다(로컬은 구독 — 시도 상한만) | Must |
| FR-10 | **스트림에 공급자** — `message.replace` · `message.done` 에 `provider`(`local_claude` · `local_codex` · `gemini` · 템플릿이면 `null`). 추가만 — 기존 칸 무변경. `message.step(polish)` 는 공급자와 무관하게 같은 이름 | Must |
| FR-11 | **측정** — `npm run explain:ab -- --provider <이름>` 으로 공급자별 평가지(템플릿 vs 그 공급자). 로컬 CLI 를 기본 공급자로 두기 전에 독립 평가자 블라인드 20건에서 템플릿 대비 열세가 아니어야 한다(FR-49). 결과를 이 REQ 체크리스트에 | Should |
| FR-12 | **로그 · 비밀** — 프롬프트 · 응답 원문 로깅 0(지금 규칙). CLI stderr 는 첫 200자만 · 토큰처럼 보이는 문자열 마스킹. CLI 의 계정 · 구독 정보는 응답 · 로그에 0 | Must |

## Acceptance Criteria

- [ ] 로컬 CLI 있음 · 허용 사용자 · 웹 → `provider: local_claude`(또는 codex) · 같은 요청 모바일 헤더 → `gemini`
- [ ] 허용 밖 사용자 → `gemini` · `COACH_LLM_LOCAL=off` → `gemini` · `COACH_EXPLAIN_LLM=off` → 템플릿
- [ ] CLI 를 PATH 에서 지운 채 기동 → 기동 로그 "로컬 CLI 없음" · 전 요청 `gemini`
- [ ] CLI 시간 초과(가짜 CLI 로 60초 대기) → 같은 요청 Gemini 로 · 자식 프로세스 0(`pgrep`)
- [ ] 요청 중단 → 자식 프로세스 3초 안에 종료
- [ ] 프롬프트가 argv 에 없다(`ps` 로 확인) · 작업 폴더가 요청 뒤 없다 · 자식 env 에 `DATABASE_URL` · `JWT_SECRET` · `GEMINI_API_KEY` 0
- [ ] 로컬 CLI 출력도 검증기를 지난다 — 완곡 권유 문장을 내는 가짜 CLI → 그 칸 템플릿
- [ ] 공급자별 블라인드 평가지 1회(FR-11) 결과 기록
- [ ] 주문 경로 0 · 프롬프트 금액 0 테스트 유지

## 열린 질문

| 질문 | 기본안 |
|---|---|
| Claude · Codex 둘 다 있으면 | Claude 먼저(`auto` 순서). 블라인드 평가(FR-11)에서 Codex 가 이기면 순서를 바꾼다 |
| 배포 환경(`OPS-001`)에서 | 컨테이너에 CLI 가 없다 → 감지 실패 → 전부 Gemini. 이 REQ 는 로컬 맥 운영(`OPS-002`) 기간의 이득이다 |
| 모델 선택 | CLI 기본 모델. `COACH_LLM_LOCAL_MODEL` 로 덮을 수 있게(선택) |

## 계약 영향

- `BFF-REQ-050`(클라이언트 헤더 · 스트림 `provider` 통과) · `FE-REQ-059`(공급자 표시) · `SRV-REQ-037` FR-16(전체 스위치) · `SRV-REQ-025` FR-62(비용 상한) · `OPS-002`(서버 맥 PATH 에 CLI)

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-02 | 작성 — 사용자 결정. 블라인드 A/B · Gemini 할당량 소진(같은 날)이 근거 |
