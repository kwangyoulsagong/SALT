# F006 알림 화면 — 체크리스트

슬라이스 `requirements/specs/in-progress/F006-alerts-screen-slice.md` · 브랜치 `feat/f006-alerts-screen` · 2026-11-18.

## 1. 요구사항 ↔ 구현

| REQ · FR | 구현 위치 | 확인 | 결과 |
|---|---|---|---|
| `BFF-REQ-027` FR-90 목록 · 쪽 | `bff/src/services/app-alerts.service.ts` `getAlerts` · `alerts.viewmodel.ts` `toNextPage` | 시험 7경계 · 실BFF 1쪽 20 · `nextPage` 2 / 2쪽 5 · null | 충족 |
| FR-91 안 읽은 수 · 읽음 · 모두 읽음 | `rest/routes/alerts.routes.ts` · `alerts.controller.ts`(204 · `no-store`) | 시험(경로 1:1 · id 인코딩) · 실호출 | 충족 |
| FR-92 갈 곳 = 코드 | `toAlertTarget` | 시험(코드 넷 · `/` 0) | 충족 |
| FR-93 만드는 경로 0 | 라우터 GET · PATCH 만 | 코드 | 충족 |
| `BFF-REQ-028` FR-45 · 48 | 계약 블록 `AlertsView` = `@repo/core/alerts` | `alerts-contract.test.ts` 글자 대조 | 충족 |
| `FE-REQ-030` FR-80 · 81 벨 · 배지 | `packages/web-shared/src/layout/AlertBell.tsx` · `AppShell.tsx` | 실화면 셸 · 투자 · 저축 · 가계부 · 홈 "알림 15건 안 읽음" · 0 이면 숨김 · 로그아웃이면 벨 없음 | 충족 |
| FR-110 행 | `apps/web/src/entities/notification/ui/AlertRow.tsx` | 1280 스크린샷 — 아이콘 · 제목 · 확인할 곳 · 시각 · 안 읽음 굵게 + 점 | 충족 |
| FR-111 누르면 읽음 + 이동 | `widgets/alert-list` `open` · `features/mark-alert-read` | 누름 → `PATCH /alerts/qa-n-2/read` + `/household` 문서 이동 · 다음 화면 배지 16 → 15 | 충족 |
| FR-112 모두 읽음 | `MarkAllReadButton` | 배지 사라짐 · 버튼 비활성 | 충족 |
| FR-113 · `FE-REQ-031` FR-103 만드는 칸 0 | — | 코드 grep | 충족 |
| `FE-REQ-031` FR-72 배지 폴링 0 | `@repo/web-shared/api` `useUnreadAlertCount` | `refetchInterval` 없음 · 포커스 재요청 끔 · 읽음 뒤 무효화 | 충족 |
| FR-100 · 101 낙관적 + 되돌림 | `useMarkAlertRead.ts` | `route` 500 — "모두 읽음 처리를 못 했어요" · 배지 15 → 15 · 점 14 그대로 | 충족 |
| FR-102 매핑 한 곳 | `@repo/web-shared/config` `alertTargetHref`(`satisfies`) | 타입 검사 | 충족 |
| FR-93(문장 없는 코드 줄 0) | `alertTextOf` | 모르는 코드 `coach.some_future_code` 행 그리지 않음(25 → 24) | 충족 |
| `FE-REQ-032` FR-64 첫 쪽 서버 · 다음 쪽 무한 | `pages/alerts/api/serverAlerts.ts` · `useAlertList` | 서버 HTML 에 첫 목록 · [더 보기] → 24 · 다음 쪽 500 → 재시도 뒤 "다음 알림을 불러오지 못했어요" | 충족 |
| FR-65 안 읽은 수 실패 | — | `route` 500 → 벨만, 배지 없음 · 이름 "알림" | 충족 |
| FR-68 공유 타입 | `entities/notification/model/alerts.ts` 재수출 | — | 충족 |
| 빈 상태 | `widgets/alert-list` | 도메인 다 끔 → "새 알림이 없어요" · 모두 읽음 없음 · 배지 없음 | 충족 |

## 2. 검증 명령

| 명령 | 결과 |
|---|---|
| BFF `npm test` | 552 통과 |
| BFF `npx tsc --noEmit` · `npm run build` | 통과 |
| FE `pnpm check-types` | 13/13 |
| FE `pnpm lint` | 13/13(경고 0) |
| FE `pnpm test` | core 305 · ui 63 통과(이름표 시험 3 더함) |
| `pnpm test:layer-check` · 새 파일 훅 사후 실행 | 차단 16 · 통과 10 · 새 파일 차단 0 |
| zone 다섯 운영 빌드(사본) | 전부 exit 0 · `/alerts` 2.5 kB · 153 kB |
| 번들 main 대비(같은 방법 빌드) | 공유 103 → 103 kB · `/home` 161 → 161 · `/household` 167 → 168(벨) · `/settings` 154 → 160 kB(+6 — 설정 패널이 `entities/notification` 배럴을 부르고 배럴에 알림 행이 들어갔다. 예산 40 kB 안) |
| `node scripts/check-done.mjs` | 통과(6번 외부 이름 목록 없음 — 건너뜀) |

## 3. 실화면 · 실데이터

임시 계정(초대 코드 `QAALERT1118` → 확인용 계정) · 도메인 셋 켬 · 알림 25건(세 종류 · 종목 없는 판단 변화 1 · 내 분류 1 · 모르는 코드 1 · 9건 읽음) ·
BFF 4001 을 브랜치 코드로 재기동(경로 · 칸 더하기만 — 옛 소비처 영향 0) · 셸 dev 3001(3000 은 다른 프로젝트) · zone 은 셸 origin 으로(셸만 `/api` 를 BFF 로 넘긴다).

| 장면 | 결과 |
|---|---|
| 1280 목록 · 더 보기 · 모두 읽음 | pass — `screen-desktop.md` §5 대조(큰 보라 버튼 → 고침, 아래) |
| 행 누름 → 가계부 zone · 다른 zone 벨 넷 | pass |
| 390 앱 웹뷰 | pass — 가로 넘침 0 · 머리 없음(앱 탭) |
| 실패 셋(다음 쪽 · 모두 읽음 · 안 읽은 수) | pass |
| 로그아웃 · 빈 상태 | pass |
| 콘솔 오류 | 정상 경로 0(실패 장면은 일부러 낸 500 만) |

실화면에서 찾아 고친 결함:

1. **종목 없는 판단 변화가 목록에서 빠짐** — 문장 함수가 종목을 필수로 봤다. BFF 는 코치 리포트로 보내는데 줄이 없어 안 읽음 수(16)와 점(15)이 어긋났다 → "코치 장기 판단이 바뀌었어요 · 코치 리포트에서 볼 수 있어요"
2. **[모두 읽음]이 큰 보라 면** — `Button variant="secondary"` 가 채운 보라로 그려졌다(§5 "큰 보라 버튼을 정보 영역에") → `ghost`
3. **빈 상태가 전체 폭 가운데** — 제목 열(720)과 따로 떠 있었다 → 페이지 열 최대 768(본문 720)

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실제 이벤트로 생긴 알림의 화면 | 이 맥 DB 에 실사용자 알림이 없다 — 행은 DB 에 직접 넣었다(서버 구독 경로는 S2c 에서 시험됨) | 소유자 계정에서 판단 변화가 생길 때(QA-001) |
| 운영 한 origin 라우팅에서 벨 요청 | 배포 인프라 없음(`OPS-001`) — 로컬은 셸 rewrites | 배포 환경 확정 시 |
| 앱 푸시 · 앱 알림 화면 | 앱 미착수 | `RN-REQ-024`~`026` |
| 목표 하나로 바로 가기 | 이벤트에 목표 id 없음 | 서버가 `goalId` 인자를 실을 때 |

## 5. 정리

임시 계정(`DELETE /api/app/me` 200) · 알림 · 설정 행 · 초대 코드 삭제 — 사람 · 알림 · 설정 · 코드 행 0 확인. 셸 dev 3001 끔. bff-rest(4001)는 브랜치 코드로 떠 있다 — 더하기만이라 main 소비처 영향 0, 머지 뒤 `ops/salt.sh restart bff-rest`.

## 6. 확인 2회차 — 사용자 "파이프라인 다하고 버그 검증 다함?"

1회차에서 빠졌던 것: `build-storybook` · axe · 변이 · 로딩 상태 실화면 · FR-72 셸 안 이동. 돌려서 결함 넷을 더 찾아 고쳤다.

| 항목 | 결과 |
|---|---|
| **로딩 빈칸**(결함) | 서버 첫 쪽이 없을 때 `return null` — 빈칸이었다 → `BlockSkeleton`. 확인: 토큰 쿠키를 `path=/api` 로만 두어 서버 조회 null · 목록 요청 2초 지연 → `aria-busy` 1 · 자리표시 보임 → 7줄 |
| **FR-72 셸 안 이동에서 배지 그대로**(결함) | `/alerts` → `/settings`(같은 zone `<Link>`)에서 벨이 다시 안 불렀다 → 주소가 바뀔 때 한 번 `refetch`(폴링 아님). 확인: 이동 사이 알림 1건 넣고 이동 → 배지 3 → 4 · 안 읽은 수 요청 1 |
| **셸 안으로 돌아오면 예전 목록**(결함 · 같은 원인) | 캐시가 있으면 `initialData` 가 무시된다 → 서버가 준 첫 쪽으로 갈아 끼움. 확인: 벨 눌러 돌아오니 새 알림이 첫 줄(7줄) |
| **대비 미달 둘 · 자리표시 안 보임**(결함) | axe `color-contrast` — "알림 설정" 링크(`inherit`) · 설명(공용 `panelDescription` neutral 500, 흰 위 3.03:1). 회색 바탕 위라 자리표시(neutral 100)도 안 보였다 → 머리 · 설명 · 목록을 본문 패널(`screen-desktop.md` §1) 위로 · 링크 1단 · 설명은 2단(흰 위 4.99:1, 새 요소만 — 공용 값은 그대로) |
| axe(wcag2a · aa · best-practice) | 고친 뒤 위반 0 |
| 배지 흰 글자 대비 | `#7949FF` 위 4.99:1 — 작은 굵은 글자 기준 통과 |
| `pnpm --filter @repo/ui build-storybook` | 통과(벨 글리프) |
| 변이 다섯 | 계약 사본 코드 이름 · 갈 곳 매핑 · 쪽 경계 `<`→`<=` · 읽음 id 인코딩 · 이름표 `hasOwnProperty` — 전부 시험이 잡음(BFF fail 1 · core fail 1). 원복은 scratchpad 사본 |
| 다시 — 타입 · 린트 · zone 다섯 운영 빌드 · 훅 | 13/13 · 13/13 · 전부 exit 0 · 차단 0 |
| 정리 | 2회차 임시 계정 삭제 200 · 행 0 · 셸 dev 끔 |

남긴 것(범위 밖 · 결정 대기): 공용 `panelDescription`(neutral 500)은 흰 패널 위 3.03:1 로 25곳이 쓴다. 참고 화면 실측값(8f3a2d99)이라 done 체크리스트 2-3("대비 수정은 새 요소에만")대로 손대지 않았다 — 바꿀지 사용자 결정.
문장 함수(`alertTextOf`)는 셸 앱에 시험 러너가 없어 단위 시험이 없다 — 1회차 결함(종목 없는 줄)은 실화면으로 잡았다.
