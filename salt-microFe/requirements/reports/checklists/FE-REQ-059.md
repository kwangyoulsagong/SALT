# FE-REQ-059 — 해설 카드 공급자 문구 · 흘린 문장 — 검증

스펙: `salt-microFe/requirements/specs/done/FE-REQ-059-F008-EXPLAIN-PROVIDER.md` · 루트 `requirements/specs/done/F008-explain-llm-routing-slice.md`

| 항목 | 결과 |
|---|---|
| `pnpm check-types` · `pnpm lint` · `pnpm test`(core 51 · ui 43) · `pnpm test:layer-check`(차단 8 · 통과 5) | 통과 |
| `pnpm --filter web build` · `--filter web-tax build` | 통과 — `/investments/[symbol]` 3.06 kB · 137 kB 그대로 |
| 훅 사후 실행 | 바뀐 4파일 exit 0 |
| Playwright route(3100) | `local_claude` "검사를 통과한 Claude 문장으로 바꿨어요." · `local_codex` "…Codex 문장…" · `gemini` · 칸 없음 → 지금 문구 · `null` → 템플릿 안내 · **끊긴 스트림**(`polish:active` provider 뒤 done 없음) → "Claude 문장을 한 문장씩 검사해 보여 드렸어요."("규칙 기반" 없음) |
| 실스택 화면(임시 계정) | 클릭 후 약 4.7초부터 16초까지 0.25초마다 글자 증가 · 끝 문구 흘린 문장 문구 · 뷰포트 스크린샷 본문 선명(요소 스크린샷의 흐림은 페이드 도중 — 계산된 불투명도 1) |
| 스크린리더 | 끝 문구 `role="status"` 그대로 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 앱 웹뷰(390) 화면 | 앱 웹뷰는 Gemini 길(예전 문구) — 문구 분기는 route 재생으로 확인 | `QA-001` |

## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`). 파일 2개(경로 이동 내용 무변경 2 · 수정 0 · 추가 0 · 삭제 0). 계약 · 동작 무변경
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2


## F017 v2 단계 1 — 판단 막지 않음 (2026-11-10, `feat/f017-s1a-judgment-caveats`)

| 항목 | 결과 | 근거 |
|---|---|---|
| 해설 막힘 문구 삭제 | 충족 | `pnpm check-types` 13/13 · `lint` 13/13 · `test`(core 295 · ui 63) · 투자 zone 운영 빌드(worktree, `/investments/[symbol]` First Load 153 kB) · 레이어 훅 사후(음성 대조 exit 2) |

| 미충족 · 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| 3종 결함 ~~160~~ → **6**(1b 2026-11-10 — 코인 · 국내 단타 과거 검산 `signal-skill@1` `f38ca6ae` · 국내 단타 원장 `326a0553`, 서버 150요청 · 300모드 실측). 남은 6 = 코인 장기 피하기 — 과거 검산 판단 날 8 < 등록 10(본 기간 뒤 9-29 ~ 만기가 온 판단만) | 규칙을 고른 기간(2018 ~ 2026-09)은 등록상 화면에 못 쓴다 — 날이 쌓이길 기다림(숨기지 않고 결함 꼬리표) | 판단 날 ≥ 10 이 차면 `npm run judgments:signal-skill -- --write` 재실행 — 코인 장기 격자상 11월 중 |
