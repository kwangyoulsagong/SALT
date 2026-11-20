# FE-REQ-031 checklists

## 2026-10-29 REQ 전수 조사

- 머리 정정 블록: 온보딩 3단계는 지금 "첫 목표" · `ONBOARDING_STEP_BODY.pending` 키는 코드에 없다 / 거래 기록 추가는 이미 있다 — `features/record-transaction`(FE-REQ-039 FR-1, F009)이 `/api/app/coach/tr / FR-102 `home.weekly-plan` 목적지는 `/home#weekly-plan`(`/` 는 로그인) / FR-35 "블록 대신 온보딩 카드"와 지금 동작(카드 + 블록 공존, FE-REQ-010 FR-25)이 다르다 — 착수 때 결정 / FR-10~13 `EventSource` 재연결 · `Last-Event-ID` 전제 재검토: 레포 선례 `shared/api/streamSse.ts` · `@r

## 2026-11-18 F006 코치 대화 1단계(`feat/f006-coach-conversation`)

- FR-2 · 3 · 10 · 13 — `features/ask-coach/api/useAskCoach.ts` — 실화면 pass
- FR-14 · 15 — Playwright route 로 끊김 4회 → 다시 받기 · 같은 답 id(POST 늘지 않음) — pass
- FR-26 — 칩 누르면 바로 전송 — pass
- FR-60 — 주문 버튼 · 거래소 링크 0 — pass
- 미충족: FR-20 · 21 위로 더 읽기 · 자동 스크롤 — F006 2단계
- 근거: 루트 `requirements/specs/in-progress/F006-coach-conversation-slice.md` · 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md`

## 2026-11-18 F006 코치 대화 2단계(`feat/f006-coach-conversation-s2`)

- FR-5 — `useAskCoach` `message.card` — pass
- FR-20 — 실화면: 맨 위 → 32 → 41 요소 · 보던 자리 유지(scrollTop 0 → 1860) · 끝나면 버튼 없음 — pass
- FR-21 — 실화면: 스트림 2초 지연 중 위로(200) → 자리 유지 · "새 답 보기" → 맨 아래 0px · 버튼 사라짐 — pass
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-coach-conversation.md` §2단계

## 2026-11-18 F006 포지션 1단계(`feat/f006-position-overview`)

- FR-90~93 — Playwright `route` 상태 확인 · 기간 전환 시 요청 목록(흐름 1회) — pass
- 미충족: FR-80~83 거래 시트 · 미리보기 디바운스(2단계)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-overview.md`

## 2026-11-18 F006 포지션 2단계(`feat/f006-position-trades`)

- FR-80 — 필드 순서(자산군 → 종목 → 매수/매도 → 수량 → 단가 → 거래일) — pass
- FR-81 — 세 칸 유효 · 300ms · 키가 입력(앞 요청 끊김) — 실화면 미리보기 12 → 10 서버 값 — pass
- FR-82 — 평단 · 총액 계산 0(grep `* price` 0) · 미리보기 실패 = 문구 + 저장 가능 — pass
- FR-83 — 재시도 0 · 낙관적 0 · 저장 뒤 Hero 보유 · 목록 다시 받음(실화면) — pass
- 같은 원인 고침: `useRecordTrade` 가 `positionAll` 무효화
- 미충족: 없음
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-trades.md`
- 확인 2회차: main 대조 — 상세 기록 → 같은 zone 안 이동으로 돌아온 포지션 갱신(2,788,000 → 2,858,000), 무효화 줄을 빼면 그대로(main 결함 재현) — pass

## 2026-11-18 F006 알림 화면(`feat/f006-alerts-screen`)

- FR-72 — `@repo/web-shared/api` `useUnreadAlertCount`(`staleTime: 0` · `refetchOnWindowFocus: false` · `refetchInterval` 없음)
- FR-100 · 101 — `features/mark-alert-read/api/useMarkAlertRead.ts` — 실패 `route` 500: "모두 읽음 처리를 못 했어요" · 배지 15 → 15 · 점 14 그대로(되돌림)
- FR-102 — `@repo/web-shared/config` `alertTargetHref`(`satisfies Record<AlertTarget, …>`)
- FR-103 — 0
- 미충족: 없음
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-alerts-screen.md`
- 확인 2회차 — FR-72 같은 zone 안 이동(`/alerts` → `/settings`)에서 배지가 안 바뀌던 결함 고침: 주소가 바뀔 때 한 번 다시 조회(폴링 0). 실측 3 → 4

## 2026-11-19 PC 격자 짝(`feat/f006-pc-panel-grid`)

- 격자 칸 안 질문 → 답 · 맨 아래 따라가기(1280×720 실화면) · 옆 칸 카드와 같은 판단 한 줄(route 통과 카드)
- 미충족: 없음 · 근거 루트 체크리스트 `requirements/reports/checklists/F006-pc-panel-grid.md`

## 2026-11-19 — 남은 FR 대조 (루트 `requirements/specs/done/WEB-perf-req-close-slice.md`)

- 미구현 FR 에 대체 근거(스펙 `## 정리 2026-11-19` 절) — 코드 무변경
- 남은 것: FR-9, FR-61 — LLM 경로 결정 · 앱 착수 때

## 2026-11-19 코치 대화 재설계가 걸침

- 코치 대화 재설계(`feat/f006-coach-chat-redesign`)가 이 REQ 파일을 걸침 — 격자 상태(배치 저장 · 칸 메뉴)는 대화 화면에서 쓰지 않는다(코드 · 경로는 남김). SSE · 재연결 · 따라 내려가기 규칙은 그대로. 입력 Enter · Shift+Enter · `isComposing` 더함
- 확인은 `FE-REQ-030` 체크리스트 2026-11-19 코치 대화 재설계 절

## 2026-11-19 — 대화 보관 한도 · 지난 대화 무한 스크롤(`feat/f006-coach-chat-history`)

| FR | 결과 | 근거 |
|---|---|---|
| FR-25 정정 · FR-123 | 충족 | core 시험 7 · 변이 셋 전부 잡힘 · 실화면: 위에서 500px 지점에서 2쪽 도착 · 끝까지 7쪽 200개 · 키 겹침 경고 0 · 600개 기준 DOM 2,457 → 1,005 · 불러오기 12.1 → 5.1초 · 힙 116 → 87MB · 스크롤 60fps |

루트 `requirements/specs/done/F006-coach-chat-history-slice.md` · 미검증 표는 그 슬라이스 체크리스트

### 2회차 — 사용자 "파이프라인 및 버그 검증 다함?"(2026-11-19)

| 빠졌던 것 | 결과 | 근거 |
|---|---|---|
| 화면에서 직접 질문 → 정리 | 충족 | 질문 120 · 메시지 240 계정에서 입력 상자로 질문 → DB 질문 100 · 메시지 200 · 새로고침하면 200개 + 보관 안내 |
| 로그아웃 · 첫 쪽 실패 · 로딩 | 충족 | 로그아웃 = "로그인하면 …" · 입력 0 / 첫 쪽 503 = "지난 대화를 불러오지 못했어요. 새로 물어볼 수는 있어요." · 입력 있음 / 첫 쪽 지연 = 자리만 |
| **지난 쪽 실패 — 요청 폭주(결함, 고침)** | 충족 | 고치기 전: 실패마다 `loadOlder` 가 바뀌어 관찰자가 다시 붙고 또 불러 1.5초에 요청 62번. 고친 뒤: 실패하면 저절로 다시 부르지 않음 — 스크롤 중 2(첫 시도 + 재시도 1) · [다시 불러오기] 1번에 +2 · 가만두면 0. 변이(옛 관찰자 코드)로 폭주 재현 → 복구 |
| **실패 문구 두 번(결함, 고침)** | 충족 | React Query `isError` 가 다음 쪽 실패에도 켜져 위 "지난 대화를 …"와 버튼 옆 줄이 같이 나왔다 — 첫 쪽 실패만 위 문구 |
| 측정 도구 결함 둘 | 기록 | 실패 주입이 주소 경로만 보고 `?cursor=` 를 못 봐 첫 측정의 "지난 쪽 실패"는 주입이 안 된 것이었다 · `main` 이 둘(좁은 화면 안내) |
| 명령 재실행 | 통과 | `check-types` · `lint` 13/13 · `test` · 투자 zone 운영 빌드 · 레이어 훅 사후 |

## 2026-11-20 `FE-REQ-030` 시작 질문 카드가 걸침

- 몫: 첫 질문 전 배치만 — 조회 · 무한 스크롤 무변경
- 확인: `FE-REQ-030` 체크리스트 같은 날 절 · `pnpm turbo run lint check-types`(web · web-savings · web-household · web-investment · `@repo/ui` · `@repo/core` — 22 작업) · `pnpm turbo run test`(core 316 · ui 84 · web-shared 10 · domain-household 9 · web 10 · domain-savings 15) · BFF `npm test` 통과
- 미검증: 없음(이 REQ 몫)
