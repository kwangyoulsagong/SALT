# F006 PC 격자 — 체크리스트

슬라이스 `requirements/specs/in-progress/F006-pc-panel-grid-slice.md` · 브랜치 `feat/f006-pc-panel-grid` · 2026-11-19.
실화면은 임시 계정(초대 코드 → 가입 · BTC 거래 1건) · 셸 3001 dev · 서버 · BFF 브랜치 코드로 재기동 · Playwright 설치 Chrome.

## 요구사항 ↔ 구현

| 요구사항 | 구현 | 확인 | 결과 |
|---|---|---|---|
| `DB-REQ-021` FR-20 · 22 표 · 사람당 서피스당 한 줄 | `prisma/schema.prisma` `PanelLayout` · `20261119100000_panel_layout` | 로컬 DB 적용 · 실 DB 동시 첫 저장 2건 → 1행 | pass |
| FR-21 조건 0 · FR-24 모양 안 봄 · 크기 상한 | 조회는 `(user_id, surface)` 유니크만 · CHECK 크기 32KB(앱 16KB 의 두 배) | `EXPLAIN (ANALYZE, BUFFERS)` 유니크 인덱스 · 버퍼 1 · 40KB → CHECK 거절 | pass |
| 계정 삭제 · 내보내기 · 등급 주석 | `coach/infrastructure/userRows.ts` · `COMMENT ON TABLE … 'record: …'` | `userRows.test.ts` 통과 | pass |
| `SRV-REQ-029` GET · PUT · FR-30 413 | `coachConversation.routes.ts` · `.controller.ts` · `ManagePanelLayout.ts` · `PrismaPanelLayoutStore` | `panelLayout.test.ts` 9(16KB 정확히 204 · +1 413 · 한글 바이트 · 배열 · 문자열 · 없음 · 모르는 서피스 400 · null · ISO) · 변이 1 | pass |
| 같은 원인 — 본문 읽기 오류 500 | `errorMiddleware` body-parser `entity.*` 4xx | 시험 3 · 변이 1 · 실측 200KB 413(전 500) | pass |
| `BFF-REQ-027` FR-50~52 · `BFF-REQ-028` 경로 | `coach-conversation.service.ts` `getPanelLayout` · `savePanelLayout` · 라우트 둘 · `error.middleware` 413 | `panel-layout.test.ts` 6 · 변이 둘(16KB 문턱 · 401 통과) · 실측 없음 null · 배열 400 · 20KB 413 · 200KB 413 | pass |
| `FE-REQ-030` FR-50 · 57 1280 경계 | `@repo/web-shared/lib` `useWideViewport` · `CoachChatBody` | 1440 · 1280×720 격자 · 1279 · 1024 구분선 0 · 격자 청크 안 받음 | pass |
| FR-51 기본 배치 | `pages/coach-chat/model` `COACH_GRID_DEFAULT_LAYOUT` | 스크린샷 1440 · 1280×720 | pass |
| FR-52 끌기 · FR-53 구분선 키 | `@repo/ui` `MovableGrid` 그대로 | 끌기(오늘의 추천 → 대화 아래) · 화살표 5번 → `aria-valuenow` 바뀜 · 저장 1번 | pass |
| FR-54 키보드 대체 메뉴 | `features/arrange-panels` `PanelMoveMenu` | 메뉴 9(옆 칸 2 × 4쪽 + 기본 배치로) · 키보드로 옮김 · 고른 뒤 포커스 메뉴 버튼 · 아래 칸 메뉴 위로 열림 · 맨 위 요소가 메뉴 항목 · 기본 배치로 | pass |
| FR-55 저장 · 실패해도 기본 | `usePanelArrangement` · `useSavePanelLayout` · `parseLayout` | 새로 고침 유지 · GET 500 → 기본 · PUT 500 → 옮긴 배치 유지 · 오류 문구 0 · 깨진 저장(모르는 칸) → 기본 · 로딩 4초 → 같은 높이(750) 자리 · `aria-busy` | pass |
| FR-56 `ssr:false` · FR-58 칸 내용은 페이지 | `CoachChatBody` `next/dynamic` · `CoachChatGrid` | 격자 코드 별도 청크 · 위젯은 다른 위젯 import 0(훅 · lint) | pass |
| 오늘의 추천 카드 한 번 | `CoachConversation` `asideCard` · `@repo/core/coach` `isSameCard` | route 통과 카드 — 옆 칸 카드 1 · 대화 안 "옆 칸 오늘의 추천과 같은 판단" 1 · 시험 2 | pass |
| 격자 안 질문 · 답 | `CoachConversation` `fill` | 1280×720 "내 포트폴리오 위험한가?" → 답 · 맨 아래 따라감 · 보내기 버튼이 격자 안 | pass |
| 좁은 화면 대화(바꾼 `CoachConversation` 기본 배치) | `fill` 기본 꺼짐 | 1024 · 390 앱 웹뷰 UA — 질문 → 답 · 맨 아래 따라감 · 입력 비움 · 대화 칸 높이 원래 규칙 · 배치 API 요청 0 · 가로 넘침 0 · 콘솔 오류 0 | pass |
| 레이어 훅 사후(Bash 로 쓴 파일) | 바뀐 TS 52개를 훅에 직접 | 차단 0 · 위반 하나 넣으면 exit 2(호출 방식 확인) | pass |
| 로그아웃 | `SignInRequired` 그대로 | 구분선 0 · "로그인하면 코치에게 물어볼 수 있어요." | pass |
| `MovableGrid` 가지 id 겹침 | `layoutTree` `freshSplitId` · `movePanel` | 시험(카운터 다음 값을 저장 트리가 이미 씀) · 변이(원래 코드) 실패 확인 | pass |
| `parseLayout` 경계 | 모르는 · 빠진 · 같은 칸 · 같은 가지 id · 깨진 모양 · 비율 당김 · 20만 겹 | 시험 12 · 변이 넷 | pass |
| `Menu` 꺾임 · 넘침 · 포커스 · 칸 넘침 | `menu.css.ts` `max-content` · `side` · `Menu.tsx` · `movableGrid.css.ts` | 칸 메뉴 실화면 · 프로필 메뉴(폭 180 그대로 · 아래로 · Esc 뒤 포커스) | pass |
| `FE-REQ-047` FR-13 남은 한 줄 | `CoachBlock.css.ts` `blockedMeta` | axe 2 → 1(남은 1 등락 파랑) | pass(이 줄) |

## 검증 명령

| 명령 | 결과 |
|---|---|
| 서버 `npm run build` · `lint` · `npm test` · `test:layer-check` | 통과 · 1,940 시험 · 차단 10 통과 6 |
| BFF `npm run build` · `npm test` | 통과 · 559 |
| 프론트 `pnpm check-types` · `lint` | 13/13 · 13/13 |
| 프론트 `pnpm test` | core 307 · ui 76 · web 10 |
| `pnpm test:layer-check` | 차단 16 · 통과 10 |
| zone 다섯 운영 빌드(사본) | 전부 exit 0 |
| 번들 main 대비(main 워크트리 · 같은 방법) | `/coach/chat` 165 → 167 kB(+2) · `/investments` 157 → 158 · `/portfolio` 149 → 150 · 나머지 같음 — 예산 40 kB 안. 격자는 별도 청크 |
| `@repo/ui` `build-storybook` | 통과 |
| axe(`/coach/chat` 격자 · 메뉴 열림) | 새 요소 위반 0 · 남은 1 등락 파랑 |
| `node scripts/check-done.mjs` | 통과(아래 커밋 직전) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 통과 카드가 실제 저장 추천으로 옆 칸에 뜨는 것 | 이 맥 DB 에 저장 추천 0행 — route 로만 | 저장 추천이 생기면(소유자 실계정 `QA-001`) |
| 등락 파랑 글자 대비 | `FE-REQ-047` FR-13 등락 색 — 사용자 결정 대기 | 사용자 결정 |
| Safari · Firefox 끌기 | 설치 Chrome 만 | `QA-001` 실기기 |
| 3탭 IA · 칸 더하기/닫기 | 범위 밖(슬라이스 문서) | — |
