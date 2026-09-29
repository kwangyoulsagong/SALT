# F010 슬라이스 3 — 화면 재배치 — 체크리스트 (2026-09-29)

영역: `bff/requirements/reports/checklists/BFF-REQ-039.md` · `salt-microFe/requirements/reports/checklists/FE-REQ-040.md`

| 확인 | 결과 |
|---|---|
| BFF | `npm test` **188 / 0**(+13) · `tsc` · `npm run build` |
| 프론트 | `pnpm check-types` 5/5 · `pnpm lint` 5/5 · `pnpm test` core 26 · ui 43 · `test:layer-check` 8 · 5 · worktree `web` · `web-tax` 빌드 |
| 번들 | `/investments` 132 → 132 kB(+0.09) · `/investments/[symbol]` 115 → 115 kB |
| 화면 | Playwright 프로덕션 빌드(`next start`) · route 고정 데이터 · 1440 · 360 — `/investments` 카드 2장 · 상세 순서 · 접기 펼침 · 페이지 오류 0 · 가로 스크롤 없음 |
| 접근성 | axe wcag2a · 2aa 새 요소 위반 0(고친 뒤) |
| 계약 | BFF 응답 필드 추가 + 새 경로 `/api/app/coach/scoreboard` · core 타입 같은 커밋 쌍 · 서버 무변경 · `.claude/rules` 레지스트리에 `judgment-overview` |
| 공통 수용 기준 | 주문 경로 0 · 프론트 금액 계산 0 · 확신 · 명령형 0 · 확률 표시 0 · 성적표 기간 · 표본 · 기준 대비 · 빗나간 사례 동반 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실제 계정 · 실제 서버 응답 화면 | 로그인 토큰 없음 — 고정 데이터 | 로그인 QA(사용자) |
| 미러 손실 비대칭 · 리포트 익절 플랜 근거 줄 화면 | 리포트 고정 데이터 미작성 | 로그인 QA |
| 성적표 실제 값 | `mode-decision@2` 표본 20 전 | v2 채점 축적 |
| 기존 대비 미달 | 이전 스타일 | 대비 정리 REQ |
| [오늘의 판정] 외 FE-REQ-040 FR-9 · 10 | 슬라이스 4 · 5 재료 | 슬라이스 5 |
