# F008 슬라이스 — 해설 근거 — 검증

범위: `requirements/specs/done/F008-explain-citations-slice.md`. 영역: `salt-server/requirements/reports/checklists/SRV-REQ-037.md` §F008 해설 근거 · `SRV-REQ-024` · `SRV-REQ-025` · `salt-microFe/requirements/reports/checklists/FE-REQ-038.md` · `bff/.../BFF-REQ-037.md`

## 코드 검증

| 항목 | 결과 |
|---|---|
| 서버 | `npm run build` · `lint` · `test` **887 / 0**(+17) · `test:layer-check`(차단 10 · 통과 6) |
| 변이 | main 의 `explain.ts` · `languageGuard.ts` · `explanationFacts.ts` · `ExplainCoachDecision.ts` 로 바꾸면 새 테스트 실패(조사 2 · 검증기 1 · 인용 2) — 사본으로 되돌림 |
| BFF | 코드 무변경 · `npm run build` · `npm test` 298 / 0 |
| 프론트 | `pnpm check-types` · `pnpm lint` · `pnpm test`(core 51 · ui 43) · `pnpm test:layer-check` · `pnpm --filter web build`(`/investments/[symbol]` 3.06 kB · 137 kB 그대로) |
| 훅 사후 실행 | 바뀐 · 새 `.ts`/`.tsx` 전부(서버 · 프론트 훅) exit 0 |
| 품질 픽스처 50 | `dropped=0 violations=0 cited=65/65 empty=0 avgLen=28.2 maxLen=41` |
| 문자열 스캔 | 서버 전체 문자열 리터럴(코치 밖 포함)에 새 검증기 위반 0 |

## 실데이터

| 항목 | 결과 |
|---|---|
| 인용 주소 · 시각 | 실 DB BTC · ETH · XRP 각 5건 — 전부 `https://news.google.com/...` · 게시 시각 · 못 쓰는 주소 0(쓰기 없음) |
| A/B 평가지 | Gemini 20회 · 실패 0 · 7건이 검증기에 10문장 걸려 템플릿으로 채움 · 집계 가짜 답 20건으로 7 · 7 · 6 확인 |
| 발견 | 뉴스 최신 2026-09-29 09:01 UTC · 최근 7일 0건 — 뉴스 워커(`dev:news`) 미기동. BFF 시세 워커(`price-updater`)도 미기동 |

## 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 블라인드 A/B 사람 평가 | 사람이 골라야 한다 | 사용자 평가 → `--score` |
| 실 토큰 스트림 · 화면 칩 링크 | 상시 서버를 이 브랜치로 재기동하지 않았다 | 머지 뒤 재기동 · `QA-001` |
