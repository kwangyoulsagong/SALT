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
- 2회차: 같은 카드 한 화면 한 번(`firstCardHolders`) · 로딩 · 로그아웃 · 다시 받기 실화면 · zone 다섯 운영 빌드 — pass
- 미충족: PC 격자(FR-51) · 홈 · 포지션 · 알림 · 설정
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md` §2단계

## 2026-11-18 F006 포지션 1단계(`feat/f006-position-overview`)

- FR-100~103 · 107 — 실화면 1440 · 390 앱 웹뷰 · 상태 다섯(빈 · 개요 실패 · 흐름 실패 · 매입가 숨김 · 데이터 부족) · 기간 버튼 키보드 · 가로 넘침 0 — pass(결함 넷 고침)
- `@repo/ui` RadarChart 스토리 셋 · build-storybook — pass
- 미충족: FR-104~106 · 109 거래 시트 · 목록(2단계) · FR-2 세그먼트(3탭 IA 안 만듦 — 정정)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-overview.md`

## 2026-11-18 F006 포지션 2단계(`feat/f006-position-trades`)

- FR-104 — `TransactionSheet` · 1440 모달 · 390 앱 웹뷰 바텀시트 실화면 — pass
- FR-105 — 매도 20(보유 12) → 저장 막힘 + "그 거래일에 가진 수량보다…" · 입력 그대로 — pass
- FR-106(정정) — `/portfolio/transactions` 목록 최신순 · 행 → 고치기(잠김 문구) · 수량 2 → 3 저장 · 첫 매수 지우기 → 서버 거부 문구 · 매도 지우기 → 목록 8 → 7 — pass
- FR-107 · 108 · 109 — 빈 상태 버튼 · 주문 링크 0 · 하단 링크 둘(보유 기록 관리 · 설정) — pass
- 상태: 목록 실패 문구(route 500) · 미리보기 실패 문구 + 저장 가능(route 500) · 390 가로 넘침 0 — pass
- axe(대화 상자 안 · 목록): 새 요소 0. 남은 2건은 `@repo/ui` 세그먼트 미선택 칸 4.18:1 — 기존 컴포넌트 · 모든 화면 공통, 규칙 "대비 수정은 새 요소에만"(`done-checklist` §2.3)이라 바꾸지 않음
- 실화면에서 고친 결함 넷: 수정 시트 첫 렌더 잘못된 날짜로 블록 깨짐 · 시트 `<form>` 안 검색칸 `<form>`(수화 경고) · 미리보기 라벨 4.41:1 · 목록 보조 글자 호버 면 4.41:1
- `check-types` 13/13 · `lint` · `pnpm test`(core 302 · ui 63) · `test:layer-check` · `web-investment` 운영 빌드(복사본 — `/portfolio` 149 kB = 1단계 149 · `/portfolio/transactions` 149 kB) · 레이어 훅 사후(바뀐 파일 전부 통과) — pass
- 미충족: 없음
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-trades.md`
- 확인 2회차: 시트 숫자 · 날짜 칸 Enter 저장 되살림(`<form>` 을 걷으며 빠진 동작) — 타입 · lint pass

## 2026-11-18 F006 알림 화면(`feat/f006-alerts-screen`)

- FR-80 · 81 — `packages/web-shared/src/layout/AlertBell.tsx` · `AppShell.tsx` — 실화면 셸 · 투자 · 저축 · 가계부 · 홈 다섯 곳 "알림 15건 안 읽음"
- FR-110 — `apps/web/src/entities/notification/ui/AlertRow.tsx`(아이콘 · 제목 · 확인할 곳 · 시각 · 안 읽음 굵게 + 점) · 실화면 24줄(25 − 모르는 코드 1)
- FR-111 — `widgets/alert-list` `open` — 누름 → PATCH `/read` + `/household` 로 문서 이동 실측
- FR-112 — `features/mark-alert-read` `MarkAllReadButton`(안 읽은 것 없으면 비활성) — 실측 배지 사라짐 · 비활성
- FR-113 — 만드는 칸 · 조건 알림 · 피드 0(코드 grep)
- 빈 상태 — 도메인 다 끔 → "새 알림이 없어요" · 배지 없음 · 모두 읽음 없음
- 미충족: 없음
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-alerts-screen.md`
- 확인 2회차 — 목록을 본문 패널 위로(§1) · axe 위반 0(링크 · 설명 대비 고침) · 배지 대비 4.99:1

## 2026-11-19 PC 이동식 격자(`feat/f006-pc-panel-grid`)

- FR-50 1280 이상 격자 · FR-57 1279 · 1024 는 격자 없음(구분선 0 · 격자 청크 안 받음) — 실화면
- FR-51 기본 배치 좌 대화 · 우상 오늘의 추천 · 우하 포지션 요약 — 1440 · 1280×720 스크린샷
- FR-52 끌기(오늘의 추천 → 대화 아래) · FR-53 구분선 `role=separator` + 화살표 5번 → 저장 1번
- FR-54 칸 메뉴(옆 칸 × 4쪽 + 기본 배치로) · 키보드로 옮김 · 고른 뒤 포커스 메뉴 버튼 · 메뉴가 아래 칸에선 위로 열림
- FR-55 저장 · 새로 고침 유지 · GET 500 / PUT 500 / 깨진 저장(모르는 칸) → 기본 배치 · 오류 문구 0
- FR-56 `ssr:false`(`next/dynamic`) · FR-58 칸 내용은 페이지(`pages/coach-chat` `CoachChatGrid`)
- axe: 새 요소 위반 0(남은 1건 등락 파랑 — `FE-REQ-047` FR-13 결정 대기)
- 미충족: 없음 · 근거 루트 체크리스트 `requirements/reports/checklists/F006-pc-panel-grid.md`

## 2026-11-19 — 남은 FR 대조 (루트 `requirements/specs/done/WEB-perf-req-close-slice.md`)

- 미구현 FR 에 대체 근거(스펙 `## 정리 2026-11-19` 절) — 코드 무변경
- 남은 것: FR-37, FR-41, 앱 하단 탭바(FR-1 모바일) — LLM 경로 결정 · 앱 착수 때

## 2026-11-19 `FE-REQ-047` 데스크톱 틀이 걸침

- 코치 대화 페이지 틀을 `PageFrame` 으로(가운데 1536 → 가득 찬 폭). PC 격자 · 대화 본문은 그대로
- 확인은 `FE-REQ-047` 체크리스트 2026-11-19 절(실화면 1440 · 900 · 390 앱 UA · 영역 검증 · zone 다섯 빌드)

## 2026-11-19 코치 대화 재설계(`feat/f006-coach-chat-redesign`)

사용자 "코치 대화 페이지 디자인 챗 디자인 하고 다 제대로 만들어 … 이상해" · "딥리서치 해서" → 리서치 `salt-microFe/requirements/reports/research/2026-11-19-coach-chat.md`(9곳). 사용자 결정 둘: 오른쪽은 고정 칸(끌어 옮기는 격자 뺌) · "이번 주 얼마" 틀린 답도 같이 고침.

| 확인 | 결과 |
|---|---|
| 1440 빈 대화(새 임시 계정) — 브리핑 카드 · 시작 질문 2×2 · 입력 박스 · 면책 한 줄 · 오른쪽 고정 칸 | 통과 |
| 시작 질문 누름 → 내 질문 말풍선 · 답 본문 · 출처 · 시각 한 줄 · 이어 묻기 3(방금 물은 것 빼고) | 통과 |
| 키보드 — Tab 순서(레일 → 머리 → 대화 기록 → 시작 질문 넷 → 입력 → 옆 칸) · 입력 Enter 보내기 · Shift+Enter 줄바꿈("내 포트폴리오\n위험한가?") · 보낸 뒤 입력 비움 | 통과 |
| 보내기 실패(`route` 500) — 입력 아래 한 줄 `role=alert` · 입력 그대로 | 통과 |
| 브리핑 실패 · 브리핑 10초 지연(카드 "모으는 중") | 통과 |
| axe(wcag2a · aa) 빈 대화 · 질문 뒤 | 0 · 0 |
| 1180 · 900 · 390 앱 UA(사이드 없음 · 한 열) | 통과 |
| "이번 주 얼마" — 안 정함: "월 적립액을 정해 두면 …" + 적립 화면 링크 · 월 130만 정함(실 DB · 임시 계정): "이번 주 적립 계획은 300,000원이에요 — 비트코인 150,000원 · 코스피 150,000원" + `plan` 링크(`/plan` 과 같은 금액) | 통과 |
| FE `check-types` · `lint` · `test`(core 309 · ui 84 · web 10) · 투자 zone 운영 빌드(`/coach/chat` 첫 로드 168 → 171 kB) · 서버 `npm test` 2011 · `lint` · `build` · BFF `build` · `test` 589 | 통과 |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| PC 격자 위젯(`pc-panel-grid`) · 칸 옮기기(`arrange-panels`) · 배치 저장 경로(서버 · BFF `panel-layout`) | 대화 화면에서 안 쓴다(사용자 결정 — 고정 칸). 코드 · 표는 남겼다 | 다른 화면이 격자를 쓰거나 지우기로 정할 때 |
| 출처 ⓘ 팝오버(계산에 쓴 입력) | 리서치 제안 — 서버가 입력 목록을 주지 않는다 | 답 응답에 입력 목록을 실을 때 |
| 서버가 정하는 이어 묻기 | 지금 칩 넷은 서버 `COACH_CHIP_QUESTION` 과 같은 고정 문장 — 화면은 방금 물은 것만 뺀다 | 대화에 LLM 이 붙을 때(`SRV-REQ-028`) |

## 2026-11-19 — 코치 대화 정렬(사용자 "정렬")

| 항목 | 결과 | 근거 |
|---|---|---|
| 제목 · 브리핑 · 시작 질문 · 입력 상자 왼쪽 끝 | 충족 | 1440 실측 모두 240 · 오른쪽 960(전: 제목 108 · 카드 244 · 입력 240) |
| 옆 칸 묶음 제목 · 줄 · 링크 왼쪽 끝 | 충족 | 모두 1132(전: 포지션 요약 아래 1144) |
| 명령 | 통과 | `check-types` · `lint` · `test` · 투자 zone 운영 빌드 `/coach/chat` 173 kB |

| 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| 대화가 쌓인 화면 · 카드 답 | 임시 계정에 대화 0 — 좌우 여백 0 이 말풍선(오른쪽 맞춤)에 닿는지 | 다음 코치 대화 실사용 때 — 말풍선은 `maxWidth` 로 오른쪽 맞춤이라 끝선만 같아진다 |

## 2026-11-19 — 대화 보관 한도 · 지난 대화 무한 스크롤(`feat/f006-coach-chat-history`)

| FR | 결과 | 근거 |
|---|---|---|
| FR-128 | 충족 | 실화면 1440 · 1024 · 390 앱 UA — "대화는 최근 질문 100개 · 90일까지만 보관해요 …" · axe 0 · 가로 넘침 0 |

루트 `requirements/specs/done/F006-coach-chat-history-slice.md` · 미검증 표는 그 슬라이스 체크리스트

## 2026-11-20 시작 질문 카드 · 입력 위 배치(`feat/fe-req-048-home-card-preview`)

| 항목 | 결과 | 근거 |
|---|---|---|
| 시작 질문 카드(아이콘 + 힌트 한 줄) | 충족 | 실화면 1440 — 힌트 문구 명령형 0 |
| 첫 질문 전 브리핑 · 시작 질문이 입력 상자 바로 위 · 넘쳐도 스크롤 | 충족 | 실화면 1440(`margin-top: auto`) |
| 명령 | 통과 | `pnpm turbo run lint check-types`(web · web-savings · web-household · web-investment · `@repo/ui` · `@repo/core` — 22 작업) · `pnpm turbo run test`(core 316 · ui 84 · web-shared 10 · domain-household 9 · web 10 · domain-savings 15) · BFF `npm test` 통과 |

| 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| 390 앱 UA | 이번은 데스크톱 | `FE-REQ-060` 4단계 앱 웹뷰 |

- 2026-11-20 걸침(`FE-REQ-076` 1단계): 알림 화면 `/alerts` 을 카드 판(`PageFrame surface="cards"`) 위 카드로 — 목록 · 문구 · 동작 그대로 — 검증은 `checklists/FE-REQ-076.md`
