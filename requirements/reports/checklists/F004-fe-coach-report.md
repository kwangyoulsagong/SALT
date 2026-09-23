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

## 후속 (2026-09-23)

| 확인 | 결과 |
|---|---|
| 모노레포 `check-types` · `lint` · `test` · `test:layer-check` | 통과(태스크 5 — `packages/mocks` 삭제) · core 24 · ui 43 · 차단 8/통과 5 |
| `@repo/ui` `build-storybook` | 통과(Button weak · FilterTabs chip 스토리) |
| BFF `npm test` · `npm run build` | 100 pass · 빌드 성공 |
| web · web-tax 프로덕션 빌드(worktree) | 성공. 리포트 109 kB · 상세 113 kB · 투자 140 kB · sitemap 1h |
| 리포트 화면(고정 데이터 · Playwright route) | 1440 · 375 가로 넘침 0, 로고 · 가격 칸 · 해요체 |
| 홈(실제 응답 모양 고정 데이터) | 목표 요약 · 목록 · 보유 로고/이니셜, 수화 경고 0 |
| dev 6개 화면 | 200 · 서비스 워커 0 · 페이지 오류 0 |
| SEO(dev HTML) | 상세 제목 · 설명 · canonical · og · `<h1>` · 가격 · JSON-LD, sitemap `<url>` 290, `/home` · `/coach/report` noindex |
| 행 이동 | 패널 버튼 0 · 클릭/Enter → 상세(`?mode` 유지) · 이름 링크 100 |

### 미검증 · 범위 밖 (후속)

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 이동 · 뒤로 가기 간헐 실패 · 복귀 레이아웃 | 로그아웃 6회 왕복 재현 0 · 1px 흔들림 — 핫 리로드 의심 | QA 단계(사용자 결정) |
| 실제 로그인 계정 화면(리포트 · 홈 · 관심 종목 탭 · 상세 코치) | 비밀번호 기록 없음 · Chrome 확장 미연결 | QA 단계 |
| 홈 디자인 | 상세 · 리포트만 바꿨다 | 다음 슬라이스 |
| 렌더 중 토큰 읽기가 남은 훅 3개 | 지금은 수화 중 결과가 같아 경고 없음 | `useHasAccessToken` 로 옮기는 정리 |
| 배포 도메인(`NEXT_PUBLIC_SITE_URL`) | 배포 환경 미정 — 지금 canonical 은 localhost | 배포 확정 시 |
