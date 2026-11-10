# SRV-REQ-050 — 해설 다듬기 공급자 라우팅 · 진짜 스트리밍 — 검증

스펙: `salt-server/requirements/specs/done/SRV-REQ-050-F008-EXPLAIN-LLM-ROUTING.md` · 루트 `requirements/specs/done/F008-explain-llm-routing-slice.md`

## 착수 전 네 질문

`coach`(S6 전 — Express) · DDL 은 원장 칸 추가만 · 원장 주인 coach · BFF 계약은 요청 헤더 + 스트림 데이터 칸 추가만.

## 코드 검증

| 항목 | 결과 |
|---|---|
| 서버 | `npm run build` · `lint` · `test` **914 / 0**(+25) · `test:layer-check`(차단 10 · 통과 6) · `prisma validate` · Swagger `failOnErrors` 생성(`X-Salt-Client` 헤더) |
| 격리(가짜 CLI · 실제 자식 프로세스) | 프롬프트 stdin 에만 · argv 에 없음 · 도구 `--tools ""` · 자식 env 에 `DATABASE_URL` · `JWT_SECRET` · `GEMINI_API_KEY` 없음 · 작업 폴더 끝나면 없음 |
| 상한 | 시간 초과 → 손자까지 그룹째 종료(고아 0) · 중단 → 3초 안 · SIGTERM 무시 → SIGKILL |
| 변이 | `process.kill(-pid)` → `child.kill` 로 바꾸면 고아 테스트 실패 — 사본으로 되돌림 |
| 라우터 | 허용 · 웹 → 로컬 · 모바일 · 허용 밖 · 없음 · 쉬는 중 · 동시 상한 → Gemini · 로컬 실패 → 같은 요청 Gemini · 연속 3실패 10분 쉼 → 10분 뒤 재선택 · Gemini 토큰 상한이면 로컬만 |
| 스트림(FR-13) | 토큰 스트림 → 템플릿 미선흘림 · 통과 줄만 즉시 delta · 걸린 줄 0 노출 · 빈 칸만 replace · `polish:active` 에 provider · Gemini → 예전 길 |
| 검증기(FR-14) | 판단 문단 문장 단위 · 금액 방향 없음 · RSI 1자리 · 완곡 권유 확장 — 서버 문자열 리터럴 1,544개 스캔에 실사용 문장 걸림 0 |
| 훅 사후 실행 | 바뀐 · 새 `.ts` 전부 exit 0 |

## 실데이터

| 항목 | 결과 |
|---|---|
| 기동 | launchd PATH 에 `~/.local/bin` 없을 땐 codex 만 잡힘 → `ops/salt.sh` · `run-server.sh` 고침 → `해설 로컬 CLI local_claude 2.1.316` |
| 실스택(임시 사용자 · 소유자 이메일 · 실 DB · 실 CLI) | LINK 단타 웹 → `local_claude`(실모델 `claude-opus-5-5`) 첫 문장 1.85초 · 17문장 · 걸림 0 · 12.5초 끝. 같은 요청 모바일 → Gemini(그날 무료 할당량 429 ×3) → 템플릿 |
| 원장 | provider · 실모델 · 버린 문장 수 기록 · 임시 사용자 · 행 삭제 뒤 원장 행 수 3 → 3 |
| 실화면(3100 · 임시 계정 · 정식 초대 가입) | 클릭 후 약 4.7초부터 16초까지 0.25초마다 글자 증가 · 끝 문구 "Claude 문장을 한 문장씩 검사해 보여 드렸어요" · 끝나고 계정 · 초대 코드 · 원장 행 삭제(계정 6→5 · 원장 7→3 · 초대 7→6) · `.env` 원복 |
| 실측으로 찾은 결함 | ① 금액 방향 오탐("하락 구간에서도 거래대금 4200억원") ② RSI 14자리 ③ 맥 잠자기로 끊긴 스트림이 "규칙 기반"으로 붙음 — 셋 다 고침 · 회귀 테스트 |

## FR-11 블라인드 평가 (독립 평가자 opus · sonnet · haiku, 키 없이)

| 회차 | 평가지 | 다수결 (Claude : 템플릿) | 메모 |
|---|---|---|---|
| 1 | `explain-ab-2026-11-02-local_claude.md`(20건 중 17, 시간 초과 2 · 1건 앞서 실패) | **1 : 16** | 평가지 "입력 사실"에 관찰 기간 줄이 없어 셋 다 "판단 뒤 24시간/30일"을 근거 없는 숫자로 판정(평가지 결함) + 진짜 빈틈(완곡 권유 · 근거 개수 · 가중치 추측) |
| 2 | `-local_claude-2.md`(1회차 문장을 지금 검증기로 다시 검사 + 관찰 기간 줄) | **16 : 1** | 남은 지적: 입력 밖 추론("숨 고르기 부담" · 분할 문구를 변동성 근거로) |
| 3 | `-local_claude-3.md` — 새 프롬프트(규칙 12 · 13)로 처음부터 20건 · 시간 초과 0 | **17 : 3** | 평가자별 opus 19:1 · sonnet 17:3 · **haiku 1:19**(짧은 쪽 선호 — 지적은 3건뿐). 셋이 공통으로 짚은 10번 = 문장 안 줄 라벨 누출("뉴스1과…") → 규칙 14 · 검사 `prompt_label` 추가(같은 날) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| Codex 실호출 스트림 · 품질 | 이 맥은 `auto` 가 Claude 를 고른다. Codex 는 `exec` 가 토큰 스트림을 주지 않아(실측) 예전 길 — 단위 테스트 · CLI 실측(6초 · 1회)만 | `COACH_LLM_LOCAL=codex` 로 평가지를 돌릴 때 |
| 모바일 실기기 | 앱 실기기 경로는 QA 몫. 헤더 판별은 단위 · 중계 테스트 | `QA-001` |

## 2026-11-10 — F018 걸침

  - `salt-server/src/shared/infrastructure/__tests__/ownerGateScope.test.ts` — 기계 검사 — 소유자 판정(`isForecastOwner`)은 전망 셋 + 해설 라우팅만 · `isKrStockViewer` 0

검증은 F018 체크리스트(`SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070` · 루트 `requirements/reports/checklists/F018-public-market-guest.md`) — 이 REQ 의 기존 확인 항목은 다시 열지 않음(동작이 바뀐 것은 국내 소유자 판정 · 로그인 조건뿐)
