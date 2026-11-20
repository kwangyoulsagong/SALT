# F000-home-dashboard 체크리스트 — 2026-11-20

영역별 근거는 `salt-microFe/requirements/reports/checklists/FE-REQ-048.md` · `FE-REQ-060.md` · `FE-REQ-054.md` · `FE-REQ-049.md` · `FE-REQ-022.md` · `FE-REQ-030.md` · `bff/requirements/reports/checklists/BFF-REQ-046.md` 같은 날 절.

| 항목 | 결과 |
|---|---|
| FE `pnpm turbo run lint check-types`(web · web-savings · web-household · web-investment · `@repo/ui` · `@repo/core` — 22 작업) | 통과 |
| FE `pnpm turbo run test`(core 316 · ui 84 · web-shared 10 · domain-household 9 · web 10 · domain-savings 15) | 통과 |
| BFF `npm test`(606+ · 새 `home-card-preview.test.ts` 13 · `home-feed.test.ts` 6 · 계약 대조) | 통과 |
| 실경로 `/api/app/home` 데이터 있음 | 94ms |
| 실화면 1440 — 임시 초대 계정 둘(데이터 있음 / 빈 계정, 끝나고 지움): 홈 미리보기 · 둘째 줄 · 빈 카드 예시 · 저축 시작 · 가계부 재배치 · 빈 달 · 레일 스크롤 top 0 · 호가 · 투자자 · `/plan` 설정 전 · 코치 시작 질문 | 충족 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 앱 웹뷰 390(홈 둘째 줄 · 저축 시작 · 가계부 시작 · 좁은 폭 호가 위아래) | 이번은 데스크톱(사용자 요청) | `FE-REQ-060` 4단계 앱 웹뷰 |
| `build-storybook` | 안 돌림 — `@repo/ui` 컴포넌트 API 변경 0(`AppNavigation` 스타일만) | PR 전 영역 검증 때 |
| 코드 주석 `BFF-REQ-046` FR-8 · 9 → FR-12 · 13 | 이미 있는 FR 번호와 겹침(스펙은 12 · 13) | PR 전 |

**zone 운영 빌드(2026-11-20, 닫힘)** — 다섯 zone `next build` 통과(`ops/salt.sh web prod`). 첫 로드: 셸 `/home` 163 → 167 kB · 저축 `/goals` 161 → 163 · 가계부 `/household` 175 → 178 · 투자 `/coach/chat` 171 → 175 · `/plan` 169(149 → 169 는 앞선 `FE-REQ-047` 투자 사이드 몫) · `/investments/[symbol]` 158 — 모두 예산(+40) 안. 운영 모드 실화면 셸 3000 로그인 · 홈 · 투자 7화면 정상

## 2026-11-20 하위 화면 같은 틀

- [x] 임시 계정(목표 2 · 넣기 4 · 지출 23 · 매달 나가는 돈 1 · 보유 1)으로 1440 실화면 — `/goals/new` · `/household/new` · `/household/budget` · `/household/templates` · `/household/challenges` · `/household/revolving` · `/household/people` · `/household/story/2026-11`
- [x] 앱 웹뷰 390(SALTApp UA) — `/home` · `/goals` · `/household` · `/goals/new` · `/household/new` · `/household/templates` · `/household/challenges` · `/plan` · `/coach/chat` 가로 넘침 0, 2단 화면은 입력 → 목록 순으로 접힘(이전 "앱 웹뷰 390 미검증" 닫힘)
- [x] turbo lint · check-types 22 작업 · test(core 316 · ui 84 · web-shared 10 · domain-household 9 · web 10 · domain-savings 15) · `test:layer-check` · 저축 · 가계부 zone 운영 빌드
- [x] 첫 로드: `/goals/new` 130 kB · `/household/new` 164 → 140 · `/household/budget` 162 → 156(서버 틀 입구) · `/household/templates` 146 · `/household/challenges` 170 · `/household/revolving` 169 · `/household/people` 171 · `/household` 178 → 180
- 미검증: 없음 — 임시 계정은 앱 삭제 경로로 지움 · 초대 코드 지움

## 2026-11-20 로딩 · 실패 실화면(Playwright `route`, 운영 모드 3100)

- [x] 홈 응답 전체 실패(500) → 한 줄 "요약을 불러오지 못했어요" · 페이지 오류 0
- [x] 부분 실패 — 카드 하나 `degraded` + 미리보기 전부 null + 최근 기록 · 다가오는 일 null → 그 세 곳만 "불러오지 못했어요", 나머지 카드 값 그대로
- [x] 로딩 4초 지연 — 대기 칸 3 × 264 · 도착 카드 3 × 264(자리 밀림 0)
- [x] 빈 저축 + 템플릿 조회 500 → 기본 순서 타일 7개
- [x] 가계부 막대 누름 → `?day=…&view=calendar` · 그날 내역 열림 · 목록/달력 전환 키보드 화살표
- [x] `@repo/ui` `build-storybook` 통과(레일 CSS) · BFF `npm run build` 통과(포트 기본값 바꾼 뒤)
