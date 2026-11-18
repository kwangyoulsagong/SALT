# FE-REQ-030 (F006 웹 UI) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/FE-REQ-030-F006-UI.md`
- 브랜치: `chore/adr-002-remnants` (`e2f2dfc`) · 검증일: 2026-10-27
- 상태: **FR-3 만 완료** — 나머지(3탭 · 홈 3블록 · 대화 · 포지션 · 알림 · 설정 · 격자)는 F006 착수 때
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-dormant-410.md`

## 1. FR-3 — `/tax` 진입 링크 0건

| 확인 | 결과 | 근거 |
|---|---|---|
| 화면 코드 `/tax` 링크 | **0건** | `apps/web/src` grep — `app/seo/robots.ts` disallow 한 줄만(링크 아님, 크롤러 차단이라 둔다) |
| 홈 브리핑 | 링크 · 문구 상수 `taxCockpitLink` 삭제 | `widgets/home-briefing` 2파일 |
| 경계 수 | 2 그대로(`FE-REQ-008` FR-26) | 링크는 경계 밖이었다 |
| `apps/web-tax` zone | 그대로 | Q1 · ADR-002 §5 |

## 2. 명령

`apps/web` `tsc --noEmit` · `eslint widgets/home-briefing` · 모노레포 `pnpm check-types` 5/5 · `pnpm lint` 5/5 · `pnpm test` 2/2 ·
`web` · `web-tax` 빌드 · 레이어 훅 사후 실행(파이썬으로 고친 2파일) exit 0.

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 홈 화면 실측(링크가 빠진 모습) | 링크 한 줄 제거 · 블록 · 경계 무변경이라 빌드 · 타입으로만 | F006 홈 3블록(이 REQ FR-10) 화면 확인 때 |
| `CrossZoneLink` 소비처 0 | zone 이 둘인 한 남긴다 | zone 존속 결정(Q1) |
| 나머지 FR | F006 | F006 착수 |

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: `AnalysisGraph` · `TipsApp` 자리(FR-10 · 21 · 22 · 24) — 그래프는 삭제(`7b2663a`), 팁은 `SavingTipBl

## 2026-10-30 — F004 슬라이스 18 설정 화면

- FR-120 부분: `/settings` · ③ 코치 그룹(F004 슬라이스 18). 미검증 · 범위 밖: ①②④⑤ 그룹 — 각 기능(F003 · 알림 · 거래 목록) 때

## 2026-11-02 — zone = 도메인 F0 (`FE-REQ-052`)

- 문서만 — FR-3 · Q1 의 `web-tax` 존폐 문장 그 자리 정정. 코드 무변경
- 미검증 · 범위 밖: 없음

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 앱 내비게이션

- 메모 — 앱 하단 탭이 4개(홈 · 저축 · 가계부 · 투자)가 됐다(`FE-REQ-054`, `FEATURE-015` FR-8). 이 REQ 의 3탭(홈 · 코치 · 자산)은 투자 zone 안 탭으로 다시 쓰는 범위(`FEATURE-015` 범위 밖)다. 코드 무변경
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행 · Storybook · 실화면(5화면 × 5폭 · 앱 웹뷰 · WebKit) — `salt-microFe/requirements/reports/checklists/FE-REQ-054.md` §2

## 2026-11-18 F006 코치 대화 1단계(`feat/f006-coach-conversation`)

- FR-30 · 32 · 33 · 34 — `features/ask-coach/ui/CoachConversation.tsx` — 실화면 1280 · 390 앱 웹뷰 pass
- FR-32 정정 — "지금 팔아야 하나?" 는 검사기 명령형 → "지금 팔 때인가?"
- 미충족: FR-31 첫 메시지 브리핑 카드 · FR-39 위로 더 읽기 · FR-51 PC 격자 — F006 2단계
- 근거: 루트 `requirements/specs/in-progress/F006-coach-conversation-slice.md` · 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md`
- 운영 빌드(worktree): 리포트 · 설정 첫 로드 156 kB 퇴행(같은 페이지 배럴) → `pages/coach-chat` 분리로 149 kB = main · `/coach/chat` 155 kB

## 2026-11-18 F006 코치 대화 2단계(`feat/f006-coach-conversation-s2`)

- FR-31 · 35 · 36 · 38 · 39 — `features/ask-coach/ui/CoachConversation.tsx` · 실화면 1280(실데이터 · 막힌 카드) · 390 앱 웹뷰 UA(통과 카드 `route`) · 브리핑 실패 `route` 502 = 한 줄 · 가로 넘침 0 · 콘솔 오류 0(대화 경로) — pass
- 미충족: PC 격자(FR-51) · 홈 · 포지션 · 알림 · 설정
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md` §2단계
