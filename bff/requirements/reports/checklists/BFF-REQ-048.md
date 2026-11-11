# BFF-REQ-048 — 체크리스트

## 2026-11-04 — 가계부 S1a · `b162ac6f`

- [x] parse 요청 본문이 BFF 로그 0 — 로그 캡처 테스트(서비스 · error middleware 깨진 JSON) + 실스택 로그 grep 0
- [x] 목표 시계 지연 시 저장 응답 지연 0 — 테스트(저축 600ms → 300ms 안에 `pending`) · 화면 다시 묻기 성공/실패 Playwright 실측
- [x] `npm run build` · `npm test` 360

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-3 리뷰 · 스티커 · FR-4 템플릿 · 챌린지 · 이야기 카드 | 서버가 없다 | 가계부 S1b |

## 2026-11-04 — 가계부 S1b

- [x] 경로 7 중계 · 확인 응답에 목표 시계(`record.savedTotal`) · 경로 값 인코딩(서비스 테스트 +2)
- [x] `npm test` ~~362 중 361 — 실패 1(`backend-switch` 추적 ID)은 main 에서도 같은 실패~~ **정정 2026-11-04: 362/362** — 테스트 로더 결함을 고쳤다(`15177092`, `BFF-REQ-045`)
- [x] `npm run build` · `tsc --noEmit` 통과 · 4001 재기동 뒤 실스택 확인

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~`backend-switch` 추적 ID 테스트 실패(기존)~~ | **닫힘 2026-11-04** `15177092` — 테스트가 `trace.ts` 를 두 벌 불렀다 | — |
| 스티커 · 챌린지 · 이야기 카드 칸 | 범위 밖 | 가계부 S1c — **정정 2026-11-04** 스티커는 S1c 닫힘, 챌린지는 S1d 닫힘, 이야기 카드는 ~~S1d~~ ~~S1e~~ ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기)(정정 2026-11-04 — S1e 는 고정비 · 이상치만) — **정정 2026-11-05** 이야기 카드는 S1g 닫힘(`MONEY-S1g-household-story-slice.md`) |

## 2026-11-04 — 가계부 S1c

- [x] 감정 · 다음 날 · 노동시간 · 안 쓴 날 경로 중계(경로 값 인코딩 · 본문 그대로) — 서비스 테스트 +1
- [x] 감정 · 급여 본문이 BFF 로그 0(로그 캡처 — `reward` · 급여 값 검사)
- [x] `npm run build` · 전체 363/363 · 재기동 후 실스택(4001 → 4010) 확인

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 챌린지 · 이야기 카드 중계 | 슬라이스 범위 밖 | 가계부 S1d — **정정 2026-11-04** 챌린지는 S1d 닫힘, 이야기 카드는 ~~S1e~~ ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기)(정정 2026-11-04 — S1e 는 고정비 · 이상치만) — **정정 2026-11-05** 이야기 카드는 S1g 닫힘(`MONEY-S1g-household-story-slice.md`) |

## 2026-11-04 — 가계부 S1d(`MONEY-S1d-household-challenge`)

- [x] 챌린지 경로 8 중계 · 목록에 저축 진행 중 목표(저축 실패면 `goals` null — 목록은 그대로, 테스트)
- [x] 보태기 순서 — 가계부 읽기 → 저축 `challenge-deposits`(가계부 기록의 금액 · 날짜 · 본문 금액 무시) → 가계부 보탰다. 저축 거절이면 가계부 안 부름 · 빈 목표 400(호출 0)(테스트)
- [x] `npm run build` · 전체 365/365(+2) · 실스택 curl 로 새 계약(`today` · `startMax` · `goals`) 확인

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 이야기 카드 중계 | 슬라이스 범위 밖 | 가계부 ~~S1e~~ ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기)(정정 2026-11-04 — S1e 는 고정비 · 이상치만) — **정정 2026-11-05** 이야기 카드는 S1g 닫힘(`MONEY-S1g-household-story-slice.md`) |

## 2026-11-04 — 가계부 S1e(`MONEY-S1e-household-fixed-cost`)

- [x] 고정비 경로 2 중계 — 키를 본문 그대로 · 경로에 키 0(테스트)
- [x] `npm run build` · 전체 366/366(+1) · launchd 재기동 · 실스택 curl 로 새 계약(`fixedCosts` · `typicalAmount`) 확인

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 이야기 카드 중계 | 슬라이스 범위 밖 | 가계부 ~~S1f~~ S1g(정정 2026-11-05 — S1f 는 내 분류 · 통장 쪼개기) — **정정 2026-11-05** 이야기 카드는 S1g 닫힘(`MONEY-S1g-household-story-slice.md`) |

## 2026-11-05 — 가계부 S1f(`MONEY-S1f-household-categories-accounts`)

- [x] FR-4 내 분류 중계 4 — 메서드 · 경로 · 본문 그대로 · 키 경로 인코딩(`../x` → `..%2Fx`) 테스트
- [x] FR-3 계약 타입 — `HouseholdCategoryVM` · `salaryShare` · `categories`
- [x] `npm run build` · `npm test` 367/367(+1) · 실스택(BFF 경유 분류 · 예산 · 저장)

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-4 이야기 카드 | 슬라이스 범위 밖 | 가계부 S1g — **정정 2026-11-05** 이야기 카드는 S1g 닫힘(`MONEY-S1g-household-story-slice.md`) |

## 2026-11-05 — 가계부 S1g(`MONEY-S1g-household-story`)

- [x] FR-4 이야기 카드 — 중계 테스트(인코딩 `../2026` → `..%2F2026`) · `npm test` 368 · `npm run build` · 실스택 BFF 경유 카드 · 400 `STORY_PERIOD_FUTURE` 그대로

### 미검증 · 범위 밖
~~없음 — FR-4 전부 닫힘.~~ **정정 2026-11-05** 

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 사람 장부 경로(FR-4) · 월 화면 리볼빙 띠 칸(FR-3) | 서버 FR-14 · FR-10 이 S1h | 가계부 S1h |

## 2026-11-05 — 가계부 S1h(`MONEY-S1h-household-revolving-people`)

- [x] FR-3 월 `revolving` 칸 · FR-4 리볼빙 4 · 사람 장부 6 경로 — 서비스 테스트(경로 조각 인코딩 · 질의는 문자열만 · 배열 · 빈 문자열은 안 실음) · `npm run build` · 369/369(+1)
- [x] 실스택 — 임시 사용자로 BFF 경유 적기 · 조회 · 끝내기 · 거절(400 코드 그대로)

### 미검증 · 범위 밖
없음 — FR-3 · 4 닫힘(서버 남은 FR-11 공제는 BFF 몫이 생기면 새 줄)


## 2026-11-05 — FE-REQ-013 FR-80 2단계 쿠키 세션

- 파일만 걸침 — `packages/domain-household/src/entities/household/api/householdApi.ts`(이 REQ 가 머리 주석 주인)에서 토큰 헤더(`authHeader()`)를 뺐다 · 로그인 여부 `useHasSession`. 토큰은 httpOnly 쿠키 · 같은 origin 이라 브라우저가 싣는다(`721063fc`). 화면 · 동작 무변경
- 확인: check-types · lint · test · zone 4 빌드 · 훅 사후 실행 · 실스택 — `salt-microFe/requirements/reports/checklists/FE-REQ-013.md` 2026-11-05

## F017 v2 단계 3 (2026-11-11, `feat/f017-s3-explain-always`)

| 항목 | 상태 | 근거 |
|---|---|---|
| 표본 코드 교체 | 충족 | `npm test` 448 |
