# F004 슬라이스 15 — FE 코치 리포트 — 체크리스트

슬라이스: `requirements/specs/in-progress/F004-fe-coach-report-slice.md` · 2026-09-23
브랜치: `feat/fe-f004-coach-report` (base `main` `dbce6cf`)
영역 체크리스트: `salt-microFe/requirements/reports/checklists/FE-REQ-026.md` §6 · `FE-REQ-027.md` · `FE-REQ-028.md` §3

## 요약

| 확인 | 결과 |
|---|---|
| `pnpm check-types` · `pnpm lint` (모노레포 전체) | 통과 (6/6 · 6/6) |
| `pnpm test` | `@repo/core` **24 pass**(+6 `coachReport.test.ts`) · `@repo/ui` 43 pass |
| `pnpm test:layer-check` | 차단 8 · 통과 5 |
| `layer-check` 사후 실행(Bash 로 쓴 파일 44개, 내용 포함) | 위반 0 |
| `web` · `web-tax` 프로덕션 빌드(worktree) | 성공. `/coach/report` 525 B · 첫 로드 134 kB(상세 페이지와 같음) · 지연 청크 gzip 3.9 kB |
| `next start -p 3100` | `/coach/report` 200 · `/home` 200 + `href="/coach/report"` |
| BFF 경로 무토큰 | `report` · `generation-status` · `ai-coach/generate` 전부 401 (경로 존재) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| **로그인 상태의 화면 렌더 · 재생성 202 → 폴링 → 갱신 · 429 남은 시간** | Chrome 확장 미연결 · 테스트 계정 비밀번호가 기록에 없다(의도) | 사용자 브라우저 스크린샷 왕복 |
| 추천 카드 `renderable: true` 렌더 | 서버 저장 추천이 전부 `failure_cases_missing`(F003 전) | F003 `IndicatorTrackRecord` 후 |
| 익절 · 행동 기록이 채워진 모습 | 로그인 가능한 계정에 보유 · 거래 없음 | 테스트 계정 보유 기록 후 |
| 375px 가로 스크롤 0 | 브라우저 실측 불가 | 위와 같이 |
| `us_stock` 익절 가격 통화 | 기존 수익 플랜처럼 `원` 고정 — 서버 통화 필드 없음 | 계약에 통화가 생길 때 |
| 성적표 · 피드백 · 성향 · 주문 전 계산 | 슬라이스 범위 밖(슬라이스 문서 표) | 각 슬라이스 |
