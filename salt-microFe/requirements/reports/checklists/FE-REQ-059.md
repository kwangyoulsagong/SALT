# FE-REQ-059 — 해설 카드 공급자 문구 · 흘린 문장 — 검증

스펙: `salt-microFe/requirements/specs/done/FE-REQ-059-F008-EXPLAIN-PROVIDER.md` · 루트 `requirements/specs/in-progress/F008-explain-llm-routing-slice.md`

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
