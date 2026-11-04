---
globs: "{apps/*/src,packages/domain-*/src}/features/**"
---

# features 레이어 (Layer 2)

## 허용 Import

- `@repo/web-shared/*` · `@/entities/*` — 허용
- `@/features/*` (다른 슬라이스) — **금지** (cross-slice)
- `@/widgets/*` · `@/pages/*` · `@/app/*` — **금지** (상위 레이어)

## 구조

```
features/{slice}/
├── model/    기능 상태 store · 액션 타입 · 상수
├── api/      mutation · 복합 액션 · SSE 구독
├── ui/       인터랙티브 컴포넌트 (이벤트 핸들러 포함)
├── lib/      기능 내부 헬퍼 · 커스텀 훅
└── index.ts
```

## 원칙

- **완결된 사용자 인터랙션 하나**를 표현한다. 슬라이스 이름에 **동사를 포함**해 의도를 드러낸다.
- `entities`의 표시 컴포넌트에 인터랙션을 입히는 역할이다.
- feature 간 공통 로직은 `shared` 또는 `entities`로 **내린다.** 두 feature가 같은 것을 필요로 하면 그건 사실 entity거나 shared다.
- 두 feature를 **함께 보여줘야** 하면 그건 `widgets`의 일이다. **feature가 feature를 부르지 않는다.**

## 우리 feature 목록

| 슬라이스 | 하는 일 | 기능 |
|---|---|---|
| `ask-coach` | 코치 대화 전송 · SSE 구독 · 스트리밍 표시 | F006 |
| `rate-recommendation` | 추천 피드백 (도움 됐음/안 됨 + 사유) | F004 |
| `run-preflight` | 주문 전 계산 (게이트 없음) | F004 |
| `complete-weekly-plan` | 이번 주 적립 완료 체크 | F003 |
| `edit-plan-settings` | 월 적립액 편집 (밴드 임계값은 읽기 전용 — 감사 문서 D9) | F003 |
| `add-goal` | 목표 저축 추가 — 2026-11-03 저축 zone(`domain-savings`)에서 계산기(서버 계산 · 디바운스)와 함께 | F000 · F012 |
| `record-deposit` | 저축 적립 단건 · 여러 목표 나눠 넣기(합계는 서버가 검증) | F012 (2026-11-03) |
| `rebalance-goals` | 목표 저울 — 월 적립을 옮겨 보며 서버가 계산한 구간 변화를 보고 [확정]만 저장 | F012 (2026-11-03 S1b) |
| `add-item-unit` | 실물 단위 만들기 · 지우기(목표당 3개, 환산 개수는 서버) | F012 (2026-11-03 S1b) |
| `compare-emergency` | 비상시 비교 — 꺼내기 vs 사용자 금리 대출, 숫자는 서버 계산 · 저장 없음 · 상품 0 | F012 (2026-11-03 S1b) |
| `record-expense` | 지출 적기 — 바로(금액 먼저) · 한 줄 · 결제 문자 붙여넣기(원문은 상태에만 · 보낸 즉시 비움) · 지우기. 목표 시계 한 줄 | F013 (2026-11-04) |
| `edit-budget` | 예산 정하기 — 50/30/20(소득만 보내고 나누기는 서버) · 봉투. 막지 않는다 | F013 (2026-11-04) |
| `manage-recurring` | 매달 나가는 돈 — "이번 달에도 나갔나요?"(서버 `stage`) · 템플릿 만들기 · 고치기 · 그만 적기 | F013 (2026-11-04 S1b) |
| `close-month` | 이 달 돌아보기 3문항 — 닫을 수 있나 · 문항은 서버 값, 점수 0 | F013 (2026-11-04 S1b) |
| `answer-feeling` | 다음 날 만족 답하기 — 1~5 또는 넘기기, 한 번만. 물을 항목은 서버 값 · 평가 0 | F013 (2026-11-04 S1c) |
| `mark-no-spend` | 안 쓴 날 표시 · 지우기 — 누를 수 있는 칸은 서버(`markable`) · 연속 일수 0 | F013 (2026-11-04 S1c) |
| `set-work-hours` | 근무 시간으로 보기 — 시급 · 월급 설정, 끄고 켬. 나누기는 서버 | F013 (2026-11-04 S1c) |
| `start-challenge` | 챌린지 고르기 — 예시(서버 키) · 이름 · 기간. 날짜 범위 · 상한은 서버 값 | F013 (2026-11-04 S1d) |
| `track-challenge` | 챌린지 하기 — 오늘 한 날 · 아낀 돈 적기 · 목표에 보태기(금액은 안 보냄) · 그만두기. 실패 · 연속 0 | F013 (2026-11-04 S1d) |
| `toggle-watchlist` | 관심 종목 추가·제거 | F000 |
| `accept-invite` | 초대 코드 입력·검증 | F000 |
| `arrange-panels` | PC 이진분할 격자 배치 변경 | F006 |
| `sign-in` | 로그인 · 세션 저장 · 홈 이동 | 현행 |
| ~~`sign-out`~~ | ~~헤더 프로필 메뉴~~ **2026-11-02 삭제** — zone 이 같이 쓰므로 `@repo/web-shared/layout` `ProfileMenu`(설정 · 로그아웃은 문서 이동, `FE-REQ-053`) | — |
| `search-asset` | 종목 검색 · 추적 자산 추가(상한 10) | F000 |
| `toggle-news-bookmark` | 뉴스 북마크 추가·해제 | F000 |
| `switch-coach-mode` | 단타/장기 모드 전환 (URL 이 유일한 저장소) | F004 |
| `explain-symbol` | 종목 판단 해설 요청 | F004 |
| `regenerate-coach` | 코치 리포트 재생성 · 쿨다운 표시 · 202 뒤 완료 폴링 | F004 |
| `record-transaction` | 보유 거래 기록 추가·수정·삭제 + 서버 미리보기. F009 에서 **추가 + 계획(선택) + 사이즈 계산**이 먼저 생겼다 | F006 · F009 |
| `set-risk-budget` | 내 기준(월 허용 손실 · 1회 최대 손실 — 원 또는 % · 한 종목 상한 · 투자금 · 목표 변동성) 설정. 필수 아님 | F009 · F010 |
| `confirm-outcome-tags` | 청산별 실수 태그 확정 · 수정(자동 후보 → 사용자 확정). 원본 판정은 서버가 보존 | F009 |
| `toggle-purchase-price` | 매입가 숨김 켜기/끄기(서버 설정). 숨는 곳은 홈 보유 요약 손익률 | F009 |
| `edit-coach-profile` | 코치 설정(기본 모드 · 매도 돌아보는 기간) 저장. 서버가 읽지 않는 설정은 칸을 두지 않는다 | F004 (2026-10-30) |
| `mark-alert-read` | 알림 읽음 · 모두 읽음 | F006 |
| `toggle-alerts` | 알림 켜기/끄기 | F006 |
| `skip-onboarding-step` | 온보딩 2단계 건너뛰기 | F006 |

> **2026-09-21** — F001·F002 가 빠지면서(`ADR-002`) `import-ledger` · `register-exchange-key` ·
> `solve-harvest` · `simulate-crypto-scenario` 를 지웠다. 레지스트리 코드도 같이 고쳤다.

> `sign-in`은 REQ 초안 목록에 없었다. **기존 로그인 화면이 이미 mutation을 갖고 있어서**
> 갈 곳이 필요했다(`entities/*/api`는 조회만 둔다). 초대제로 바뀌면(`FE-REQ-011`)
> `accept-invite`와 합쳐지거나 대체된다.

## 금지된 것 — 이 제품의 제약이 features에 걸린다

- **주문을 실행하는 feature를 만들지 않는다.** `run-preflight`는 계산 표시 전용이고 게이트·차단 동작이 없다.
- **금액을 계산하는 feature를 만들지 않는다. 예외는 없다.** 하나 있던 예외(`simulate-crypto-scenario`)는 F002 와 함께 빠졌다(`ADR-002`). `record-transaction` 의 평단 전후도 서버 미리보기다.
- **낙관적 갱신은 피드백·체크 같은 비금액 상태에만** 허용한다. 금액 화면에서 금지.

