---
id: SRV-REQ-050
area: server
kind: FUNC
title: "F008 해설 다듬기 라우팅 — 로컬 CLI(Claude Code · Codex)가 있는 사용자는 그것으로, 없거나 모바일이면 지금처럼 Gemini"
priority: medium
created: 2026-11-02
source: 사용자 결정 2026-11-02 "로컬 llm 이 있는 사람은 터미널로 claude 나 코덱스로 하고 없거나 모바일이면 제미나이 지금으로" · pm/requirements/specs/in-progress/FEATURE-008-forecast-intelligence.md FR-45 · FR-69 · 구현 중 사용자 "스트리밍도 제대로 안 되는 느낌으로 하다가 그냥 정보 짝 나와 — 스트리밍 제대로 만들어" · "클로드 코덱스가 들어왔으니 더 정확하게 — 더 분석 잘하니까"(같은 날)
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
| FR-13 | **진짜 스트리밍**(사용자 2026-11-02) — 전엔 템플릿 문장을 한 틱에 전부 `delta` 로 쏟고 LLM 문장은 끝에 `replace` 한 번이라 "정보가 짝 나왔다". 로컬 CLI 는 **줄 형식**(`판단:` · `근거:` · `주의:` · `뉴스N:` — 한 줄 한 문장)으로 쓰고, 토큰 스트림(Claude `stream-json`)에서 줄이 끝날 때마다 **검사(`guardExplanationLine` — 끝 검사와 같은 사실 · 극성)를 통과한 문장만 즉시 `delta`**. 템플릿을 먼저 쏟지 않는다(`draft:skipped` · `polish`/`verify` 동시 active, `polish:active` 에 `provider`). 빈 칸만 끝에 템플릿 `replace`. 토큰 스트림이 없는 공급자(Gemini · Codex — `exec` 는 끝에 한 번, 실측)는 예전 길(템플릿 먼저 → `replace`). 검사 전 원문은 여전히 0(FEATURE-008 FR-47) | Must |
| FR-14 | **더 깊은 분석 · 덜 버리기**(사용자 2026-11-02) — 로컬 CLI 프롬프트는 "설명"이 아니라 "분석": 근거끼리 같은 방향인지 엇갈리는지 · 판단이 약해지는 조건 · 기사와 판단의 관련 약함. 새 숫자 · 가격 수준 · 과거 성적 숫자 금지(성적은 4요소 한 벌로만 — F009 FR-33, 카드가 그린다). 검증기는 판단 문단을 **문장 단위**로(예전엔 한 문장만 걸려도 문단 통째 템플릿) · 금액 사실(현재가 · 거래대금)은 방향 없음(근처 "하락" 이 금액에 음수를 붙여 맞는 숫자가 걸렸다 — 실측) · RSI 는 소수 1자리로 실음(원값 14자리를 모델이 옮겨 적었다 — 실측) | Must |

## Acceptance Criteria

체크리스트: `salt-server/requirements/reports/checklists/SRV-REQ-050.md`

- [x] 로컬 CLI 있음 · 허용 사용자 · 웹 → `provider: local_claude`(또는 codex) · 같은 요청 모바일 헤더 → `gemini` — 단위 · 실스택(임시 사용자)
- [x] 허용 밖 사용자 → `gemini` · `COACH_LLM_LOCAL=off` → `gemini`(감지 null) · `COACH_EXPLAIN_LLM=off` → 템플릿(기존 테스트)
- [x] CLI 를 PATH 에서 지운 채 기동 → "로컬 CLI 없음" · 전 요청 `gemini` — `detectLocalCli` PATH 없음 테스트 + 기동 로그 문구
- [x] CLI 시간 초과 → 같은 요청 Gemini 로 · 자식 · 손자 프로세스 0 — 가짜 CLI(손자 포함) · 그룹 종료 변이로 확인
- [x] 요청 중단 → 자식 3초 안에 종료 · SIGTERM 무시해도 SIGKILL
- [x] 프롬프트가 argv 에 없다 · 작업 폴더가 요청 뒤 없다 · 자식 env 에 `DATABASE_URL` · `JWT_SECRET` · `GEMINI_API_KEY` 0 — 가짜 CLI 가 받은 것을 기록해 대조
- [x] 로컬 CLI 출력도 검증기를 지난다 — 권유 · 지어낸 숫자 줄은 흘리지 않음(스트림 테스트 · 실측 "4200억원" 오탐을 고침)
- [x] 공급자별 블라인드 평가지(FR-11) — 3회(1:16 평가지 결함 → 16:1 → 새 프롬프트 17:3, 다수결). 열세 아님 → 로컬 Claude 를 기본 공급자로 둔다. haiku 단독은 템플릿 선호(1:19) — 체크리스트
- [x] 주문 경로 0 · 프롬프트 금액 0 테스트 유지(전체 911 → 통과)
- [x] (FR-13) 토큰 스트림 공급자는 템플릿을 쏟지 않고 검사를 통과한 문장을 쓰는 즉시 흘린다 — 실화면 클릭 후 약 4.7초부터 16초까지 0.25초마다 글자가 늘어남
- [x] (FR-14) 판단 문단 문장 단위 · 금액 방향 없음 · RSI 1자리 — 회귀 테스트

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
| 2026-11-02 | 구현(`feat/f008-explain-llm-routing`) · 블라인드 3회 · 라벨 누출 검사(`prompt_label`) — 라우터 · 로컬 CLI(격리 · 그룹 종료) · 원장 `provider` · `dropped_sentences`(마이그레이션 `20261102120000_llm_call_provider`) · 토큰 상한은 Gemini 만. 사용자 추가 요구로 **FR-13 진짜 스트리밍 · FR-14 깊은 분석** 더함. launchd PATH 에 `~/.local/bin`(`OPS-002`) |
| 2026-11-11 | **F017 v2 단계 3**(`feat/f017-s3-explain-always`) — FR-3 배치 표지 — 해설 스냅샷 배치는 로컬 CLI 가 쓴다(사용자 · 클라이언트 무관, 공용 문장 하나 — 쉬는 중 · 바쁨이면 Gemini). FR-4 모바일 → Gemini 는 요청 경로 해설이 없어져 쓰는 곳 0 — `explainClientOf` 삭제 |
| 2026-11-11 | **F017 v2 단계 3 정리**(`feat/f017-s3-explain-always`) — FR-3 허용 사용자 · FR-4 모바일 → Gemini 분기 **삭제** — 부르는 곳이 해설 스냅샷 배치 하나라 고를 사람 · 클라이언트가 없다. `ExplainRouteInput` = 로컬 있음 · 쉬는 중 · 바쁨뿐 · env `COACH_LLM_LOCAL_USERS` 삭제 · 소유자 판정 허용 목록에서 빠짐(`ownerGateScope.test.ts`) |
- 2026-11-10: F018 로그인 없이 시세 보기(`ADR-011` · 루트 `requirements/specs/done/F018-public-market-guest-slice.md`)가 이 REQ 의 파일을 걸침 — 이 REQ 의 FR 은 그대로, 바뀐 몫:
  - `salt-server/src/shared/infrastructure/__tests__/ownerGateScope.test.ts` — 기계 검사 — 소유자 판정(`isForecastOwner`)은 전망 셋 + 해설 라우팅만 · `isKrStockViewer` 0
| 2026-11-12 | F016 단계 D(짝 — 이 REQ 가 머리 주인인 파일): 로컬 CLI 격리 인자를 함수 하나로 뺐다(`localCliArgs`) — 해설 · 한 줄이 같은 격리(도구 0 · 설정 · MCP 0 · stdin 프롬프트). 해설은 그대로 `stream-json`, 한 줄은 `text` |
| 2026-11-12 | F016 단계 D 확인 2회차 — 라우터 상태(동시 · 연속 실패 · 쉬기)를 `LocalCliGate` 로 빼 오늘 등락 한 줄 작성기와 공유(`c518c96f`). 동작 그대로 |
