# FE-REQ-056 — 체크리스트


## 2026-11-02 — MONEY-F1(`FE-REQ-053`) 투자 zone 분리 · 홈 카드

- MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — 셸 홈 → 도메인 요약 카드(투자 블록 · 매입가 숨김 잎 삭제)(`417076d8`). 파일 1개(경로 이동 내용 무변경 0 · 수정 1 · 추가 0 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행(바뀐 TS 전부) · 실화면 — `salt-microFe/requirements/reports/checklists/FE-REQ-053.md` §2

## 2026-11-03 — MONEY-F2(`FE-REQ-054`) 앱 내비게이션

- 이 REQ 에 걸린 몫(`FE-REQ-054`) — 저축 탭은 `@repo/core/navigation` `APP_TABS` 에서 `readyBy: "FE-REQ-056"`(비활성 "준비 중"). 저축 첫 화면(`/goals`)이 생기면 `readyBy: null` 로 · zone 레이아웃에 `AppShell` + `VIEW_TRANSITION_CSS`(투자 zone 레이아웃과 같은 꼴) · `next.config.js` 를 vanilla-extract 로 감싼다
- 확인: 모노레포 check-types · lint · test · zone 5 빌드 · layer-check · 훅 사후 실행 · Storybook · 실화면(5화면 × 5폭 · 앱 웹뷰 · WebKit) — `salt-microFe/requirements/reports/checklists/FE-REQ-054.md` §2

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

| FR | 구현 | 검증 |
|---|---|---|
| FR-1 | `packages/domain-savings` · `apps/web-savings` · 레지스트리 · `APP_TABS` · 셸 삭제 | check-types · lint · zone 5 빌드(`/goals` 146 kB · `/goals/new` 125 kB · `/goals/[id]` 146 kB First Load) · core 테스트 83(레지스트리 · 탭 갱신) |
| FR-2 · 3 | `AddGoalForm` | 실화면: 결혼 · 3천만 · 2028-11-01 → "매달 넣을 돈 1,250,000원 · 24개월 · 2028년 11월" → 만들기 → 상세 이동 |
| FR-4 | `DepositForm` · `SplitDepositForm` | 실화면: 125만 적립 → "기록했어요" · 진척 4.1% · 이정표 차이 0원 · 최근 적립 1건 |
| FR-5 · 7 | `ProjectionLine` · `MilestoneBox` · `GoalCard` | 실화면: "계획대로면 2028년 10월" + 이유 + 채점 대기 |
| 화면 틀 | `AppShell` 안 div | 1024 · 1280 · 1440 · 1600 × 3화면 가로 넘침 0 · 콘솔 오류 0 · `<main>` 중첩 발견 → 고침 |
| 금지어 · 계산 | grep | 금지어 0 · `/ 100 · Math.` 0(`b1c8ad67`) |

미충족: FR-13 서버 렌더(`FE-REQ-013`) · FR-2 첫 도장 · FR-4 모션 · FR-5 팬 차트 · FR-6 · 8~12(S1b). 앱 웹뷰 390 · 셸(3000) 경유 실측 — 3000 을 다른 프로젝트가 쓰고 있어 zone 3003 직접(셸 rewrites 는 레지스트리 생성이라 경로만 다름).

- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`
- 번들(Next 표 First Load, 운영 빌드): 저축 zone 새 화면 `/goals` 146 · `/goals/[id]` 146 · `/goals/new` 125 kB(공용 102) · 셸 `/home` 158 → 154 kB(F2 기록 대비 — 임시 목표 목록 · `goal` store 삭제) · 투자 zone 무변경

## 2026-11-03 — 미검증 닫기(사용자 "확인하지 못한 것은 베스트케이스")

| 항목 | 결과 |
|---|---|
| 셸 경유 | 우리 셸을 3010 에 띄워(3000 은 다른 프로젝트) rewrites → 저축 zone: `/goals/new` 만들기 → 상세(`data-zone=savings`) · 홈 저축 카드 `/goals` "셸 경유 여행 0.0%" → 클릭 → `/goals` · 저축 탭 `aria-current=page`(눌림 막힘 없음) · `/goals/addgoals` → `/goals/new` |
| 앱 웹뷰 390(UA `SALTApp/1.0.0`) | 안내 꺼짐 · 카드 2 · 가로 넘침 0 |
| 일반 브라우저 390 | 768 미만 안내 켜짐(`FE-REQ-043` 그대로) · 넘침 0 |
| 결함 | '새 목표' 가 브라우저 기본 파란 밑줄 링크 → 작은 링크 버튼(`b0768194`) |
| 콘솔 · 페이지 오류 | 0 |
| 남은 미충족 | FR-13 서버 렌더 — 토큰 쿠키 이전(`FE-REQ-013`)이 먼저. 이 슬라이스에서 닫을 수 없다 |

## 2026-11-03 — 코드 리뷰(high) 10건 `c82be47c`

- `c82be47c` — ⑦ `reached` 문장 · ⑩ `formatWon` 한 곳 · `issuedAt` 타입 제거
- 검증: Kotlin 종단 10(대소문자 중복 400 · 목록 = 상세 구간 · exists) · 도메인 19 · 경계 8 · 플랫폼 14 · 서버 936 · BFF 351 · 모노레포 check-types · lint · test · web-savings 빌드 · 훅 사후 · 실스택(프로브 done true/false)

## 2026-11-03 — 쿠키 세션 1단계 `0ef25f6b`

- FR-13 **done** — 저축 목록 · 상세가 서버에서 쿠키로 BFF 를 불러(1.5초 상한 · 실패면 null) `initialData` 로 — 첫 숫자가 HTML 에. `/goals` 는 이제 동적 렌더(ƒ)
- 실측: `/api/session` POST 204 + HttpOnly · 다른 사이트 403 · 모양 틀림 400 · DELETE 지움 · 셸 경유 `/goals` · `/goals/[id]` HTML 에 목표 이름 · 금액(쿠키 없으면 없음) · 브라우저 첫 진입에 쿠키 채움 · `document.cookie` 에 안 보임 · 수화 오류 0. 모노레포 check-types · lint · test · web · web-savings 빌드 · 훅

## 2026-11-03 — MONEY-S1b(F3b) 저울 · 재미 · 비상시

| FR | 구현 | 확인 |
|---|---|---|
| FR-2 | `AddGoalForm` 첫 도장 미리보기 | `/goals/new` 서버 HTML 에 "도장 1개" · 안내 문장 |
| FR-4 · 8 | `GoalScene` · `@repo/ui` `ProgressScene` | 적립 뒤 "10칸 중 5칸 → 6칸" · 기본 설정 10프레임 이동 · 줄인 모션 중간 프레임 0(2값) |
| FR-6 | `features/rebalance-goals` | 첫 차 월 적립 바꿈 → "N개월 빨라져요" · 합계 전후 · [확정] → "월 계획을 바꿨어요" · 입력 칸이 새 계획 |
| FR-7 | `MissedMonthsBox` · `features/compare-emergency` | 상세 "아직 다 지난 달이 없어요" · 10만 원 · 5% · 12달 → "매달 8,561원씩" · ~~"이자 합계 2,732원"(= 8,561 × 12 − 10만)~~ ~~**정정 `4fda31db` · `cd3bc574`: "마지막 달은 8,558원" · "이자 합계 2,729원"(8,561 × 11 + 8,558 = 10만 + 2,729)**~~ **재정정 `af797be0` · `9f74c874`: 화면 "처음 4개월 8,334원 · 나머지 8개월 8,333원 · 이자 합계 0원"(0%) · "한 번에 100,510원"(1달) · 1원 · 120달은 대출 칸만 사유** · "도달이 1개월 늦어져요" |
| FR-9 | `features/add-item-unit` · 목록 `unitLine` | 단위 추가 · 상한(3)에서 입력 칸 숨김(서버 `unitLimit`) · 목록 "모은 돈 = 제주 왕복 N개" |
| FR-10 | `StampBoard` · `PostcardList` | 도장 2 → 3 → 4 · 다 찬 비상금 엽서 "0일 · 적립 1번"(서버 HTML 에도) |

- 실화면(3003, 임시 사용자 · 셸 미경유): `/goals` · 상세 — 가로 넘침 0 at 768 · 900 · 1024 · 1280 · 1440 · 1600 · 앱 웹뷰 390 · 768. 콘솔 오류는 `/api/session` 404 하나 — zone 에 직접 붙어서 생기는 셸 경로(쿠키 세션 1단계부터 있던 것, 셸 경유에선 없다)
- 결함 1(실측이 잡음): 저울 `key` 에 계획 금액 → 확정 응답에 다시 마운트돼 성공 문구가 사라짐 → 목표 id 만(`6ad345fc` 전에 고침)
- 모노레포: check-types · lint · test(core 83 · ui 43) · test:layer-check 26 · 훅 사후 실행(바뀐 TS 전부) · zone 5 운영 빌드 · Storybook 빌드
- 번들(First Load): `/goals` 146 → 149 · `/goals/[id]` 146 → 150 · `/goals/new` 125 → 126 kB(공용 102) — 증가 +3 · +4 kB(예산 40)
- ~~미검증: 셸(3000 → rewrites) 경유 실화면 — 3000 은 이날도 다른 프로젝트. S1a 에서 셸 3010 경유를 쟀고 이번 변경은 zone 안 화면뿐이라 경로 · 셸이 무변경~~ **닫힘 2026-11-03** — 셸 3010 경유 13단계(루트 체크리스트 §4): 쿠키 · 홈 카드 → 탭 → 저축 zone · 서버 렌더 · 저울 · 확정 · 비상시 사유 셋 · 단위 · 장면 · 첫 도장 · 넘침 0 · 웹뷰 390 · 일반 390. 4xx 는 의도한 400 둘뿐(`/api/session` 404 없음). 결함 1 → `cd3bc574`. 수정 뒤 모노레포 check-types · lint · test · layer-check · 훅 · 저축 zone 빌드(`/goals/new` 126 kB) 재실행
- 2026-11-03 `9f74c874` — 화면 5경우(6% 100만 12달 · 0% 10만 12달 · 0% 60만 6달 · 6% 100,010원 1달 · 1원 120달) 문구 실측 · 페이지 오류 0 · 모노레포 check-types · lint · test · layer-check · 훅 · 저축 zone 빌드 재실행
- 2026-11-03 `6f90828c` — 화면 5경우 재실측(1원 · 120달은 대출 칸 사유 · 가정 문장 없음) · 모노레포 check-types · lint · test · layer-check · 훅 · 저축 zone 빌드
- 2026-11-03 `d4f948a4` — 모노레포 check-types · lint · test · layer-check · 훅 · 저축 zone 빌드 · 화면 5경우 재실측(페이지 오류 0)
- 2026-11-03 `0e8c0f05` — 화면: "1000.5" 입력 → "1,000"(고치기 전 "10,005" — 실측이 잡음) · 먼 목표 꺼내기 "이 월 계획으로는 100년 안에 닿지 않아요" · 페이지 오류 0. 모노레포 check-types · lint · test · layer-check · 훅 · 저축 zone 빌드(`/goals/[id]` 151 kB)
- 2026-11-03 `e0a0961b` — 화면: "12,345" 중간에 점 → 12,345 그대로 · "1000.5" 붙여넣기 → 이전 값 유지 · 정상 계산 그대로 · 페이지 오류 0. 모노레포 · 훅 · 저축 zone 빌드(`/goals/[id]` 151 kB)
- 2026-11-03 `68f6ac41` — 화면: 느린 목표 구간 "100년 안에 닿지 않는 속도라 시점을 정할 수 없어요" · "1000．5" → 이전 값 + 안내 · 유효 입력 뒤 안내 사라짐 · 페이지 오류 0. 모노레포 · 훅 · 저축 zone 빌드
- 2026-11-03 `ac23eaaf` — 화면: 적립 "1000．5" → 이전 값 + 안내 · 전각 "１２３" → 123 · "1000·5" 거절 · 금리 "3．5" → 3.5 · 단가 "5 000" → 5,000 · 만들기 "1000·5" 거절 + 안내 · 저울 "2．0" 거절 · 페이지 오류 0. 모노레포 · zone 5 빌드(web-shared 변경) · 훅
- 2026-11-03 `641a11db` · `92b0e947` — core 허용표 40 통과(core 테스트 123) · 화면: "1000 5" · "1000²" · "①②③" 거절 + 안내 · "50,000원" · "₩70,000" 받음 · 금리 "3,5" 거절 · "3．5" · "3.5%" → 3.5 · 개월 "1.5" · "1 2" 거절 · "２４" → 24 · 거절 뒤 제출 → "기록했어요" · 만들기 이율 안내 · 페이지 오류 0. 모노레포 · zone 5 빌드 · 훅
- 2026-11-03 `bd571eae` · `d21bd5c1` · `c786ab91` — core 테스트 147(입력 64) · 모노레포 · zone 5 빌드(`/goals/new` 128 kB) · 훅
- 2026-11-03 `5afe2476` · `5fd864d1` · `e8fe98fe` — 화면: 적립 거절 → 칸 오류 · 제출 뒤 칸 비고 오류 없음 · 저울 처음 값(계획) · A 거절 + B 정상 → A 오류 유지 · B 결과 · 되돌리기 → 값 · 오류 지움 · 이율 거절 뒤 이자 끄고 켬 → 오류 없음. core 테스트 158 · 모노레포 · zone 5 빌드 · 훅
- 2026-11-03 옛 `formatAmountInput` 삭제 — 모노레포 check-types · lint · zone 5 빌드 · core 테스트

- 리뷰 12차(2026-11-03): 퇴행 3건 고침 `ccb5ebb7` · `4830cfcf` · `98573b1b` — `pnpm check-types` · `lint` 11/11 · core 169 · ui 43 · layer-check 16/10 · zone 빌드 · storybook 통과. 고치지 않은 정리 5건은 루트 회고 `MONEY-S1b-savings-fun.md` §12차. 리뷰 종료
- 2026-11-03 `e62e659f` · `02f79f59` 뒤: zone 5 빌드 5/5(`/goals/[id]` 152 kB) · storybook · 실화면(실물 단위 지운 뒤 가격 안내 유지 · 거래 기록 접힌 손절가 → 펼침)

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- [x] 문서만
