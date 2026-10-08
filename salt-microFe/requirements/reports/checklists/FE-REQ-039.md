# FE-REQ-039 거래 기록 · 계획 · 사이즈 결과 · 내 계획 · 리스크 게이지 — 체크리스트 (2026-09-24)

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 거래 기록 카드 | `features/record-transaction/ui/RecordTradeCard.tsx` · `api/recordTransactionApi.ts` | Playwright 1440 · 375 — 수량 · 단가 입력 → 콤마(`91,200,000`) → 기록 → "기록했어요 · 계획도 함께 저장했어요" |
| FR-2 계획(선택) | 같은 파일 — 접힘은 조건부 렌더(`hidden` 은 `display:flex` 에 덮였다) | 키보드: 계획 머리 Enter → 손절가 → Tab → 이유 |
| FR-3 결과 줄 | `entities/coach/ui/SizeCheckLines.tsx` · `api/useSizeCheck.ts`(300ms 디바운스 · 이전 값 유지) | 손절가 없음: 비중 줄 + "손절가를 적으면…" · 있음: 최대 손실 · 1회 · 월 · 비중 · 참고 수량 · 5연속 · 가정 2줄 |
| FR-4 `aria-live` | 결과 줄 · 저장 알림 | 코드 확인 |
| FR-5 계획만 다시 저장 | `useRecordTrade.retryPlan` | 코드 확인 — 브라우저에서 계획 실패 경로는 돌리지 않았다 |
| FR-6 오류 문구 | `PORTFOLIO_INSUFFICIENT_QUANTITY` · 401 · 그 외 | 코드 확인 |
| FR-7 내 계획 카드 | `entities/coach/ui/TradePlanCard.tsx` · `api/useTradePlans.ts` | 방향 · D+3 · 작성일 · 거래와 연결됨 · 손절가 · 이유 |
| FR-8 게이지 3 | `entities/coach/ui/RiskGaugeList.tsx` | 기준 없음 → "기준을 정하면 보여요"(막대 없음) · 저장 뒤 `−620,000원 / 1,500,000원 · 41% 사용` · 집중도 초과 → 막대 색 + "기준을 넘었어요" |
| FR-9 예산 입력 | `features/set-risk-budget` | 월 · 1회 입력 → 저장 → 게이지 갱신(응답을 캐시에 그대로) |
| FR-10 코치 리포트 자리 · 격리 | `widgets/coach-console/ui/RiskBudgetPanel.tsx` — 리포트 `unavailable` 이어도 패널이 보인다 | Playwright(리포트 `unavailable` 고정) |
| FR-11 3종 고지 | `@repo/ui/disclosureSlot` · `entities/coach` `CoachDisclosure` | 세 카드 모두 세 줄 |
| FR-12 `compact` 입력 | `@repo/ui/textField` 변형 + `Compact` 스토리 | `build-storybook` |
| FR-13 매입가 숨김 | — | **보류**(아래 표) |

| 확인 | 결과 |
|---|---|
| 타입 | `pnpm check-types` 5/5 |
| 린트 | `pnpm lint` 5/5(`--max-warnings 0`) |
| 단위 테스트 | `pnpm test` — core 26 · ui 43 통과(이 REQ 의 새 테스트 없음 — 아래 표) |
| 빌드 | `web` · `web-tax` 통과 · `@repo/ui build-storybook` 통과 — **마지막 수정 셋(글꼴 · 대비 · 리포트 없어도 게이지 표시) 전 상태에서.** 그 뒤는 `check-types` · `lint` · dev 서버 브라우저 확인만(dev 가 `.next` 를 같이 써서 다시 빌드하지 않았다) |
| 레이어 훅 | Bash 로 쓴 41개 파일에 `layer-check.mjs` 사후 실행 — 막힘 0 |
| 번들 | 첫 로드 `/coach/report` 110 kB · `/investments/[symbol]` 115 kB(2026-09-23 기록 109 · 113). 새 카드는 이미 `ssr:false` 지연 청크 안이다 |
| 접근성 | axe(wcag2a · 2aa) — 새 카드 위반 **0**(빈 상태 · 저장 뒤 · 상세). 처음 돌렸을 때 게이지 라벨 4.26:1 · 흐린 값 3:1 → neutral 700 으로 고쳤다 |
| 반응형 | 1440 · 375 가로 스크롤 없음 · 페이지 오류 0 |
| 디자인 기준 | 참고 화면 실측(주문 패널, 1920px): 라벨 열 약 70 · 입력 32 · 헤어라인 0.75px · 칩 28/모서리 7 · 13px 조밀 — `FE-REQ-039` 설계 원칙 |
| 공통 수용 기준 | 주문 경로 0(버튼 "기록하기", "주문은 나가지 않아요") · 프론트 금액 계산 0(손절 % 프리셋을 뺀 이유) · 명령형 0 · 3종 고지 고정 |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| 실 서버 값으로 화면(로그인 상태) | 로컬 토큰 발급 불가 — Playwright 고정 응답으로만 확인 | `QA-001` 로그인 QA(사용자) |
| 거래 1건 + 계획 30초(사람 5회 평균) | 사람이 재야 한다 | `QA-001` 로그인 QA |
| 매입가 숨김 토글(FR-13) | 웹에 평단 · 손익률을 보이는 화면이 없다 | 포지션 화면(`position-overview`) 생길 때 |
| 손절 % 프리셋(−5/−8/−10%) | 가격 × 비율 = 프론트 금액 계산 | 서버가 프리셋 가격을 주면(`SRV-REQ-038` 후속) |
| 손절까지 거리(원) · 4주 도달 확률 | 서버 필드 없음 · 도달 확률은 F008 소유자 전용 | 서버가 거리 필드를 주면 · F008 FR-7 연동 |
| 예산 % 단위 입력 · 목표 변동성 입력 | 원만 받는다 | 슬라이스 6(코치 대화 3문항과 같이) |
| `SegmentedControl` 안 고른 칸 대비 4.18:1 | 기존 `@repo/ui` 스타일 — 모든 화면 공통 | `@repo/ui` 대비 정리 REQ |
| 전역 글꼴 없음(`body` 에 `font-family` 없음 → 세리프) | 기존. 새 카드는 토큰 글꼴을 직접 갖게 했다 | 전역 스타일 결정(사용자) |
| 마지막 수정 뒤 `next build` 재실행 | dev 서버와 `.next` 를 같이 쓴다 — 도는 중에 빌드하면 dev 가 깨진다 | 머지 전 dev 를 내리고 한 번(작성자) |
| `apps/web` 단위 테스트 | 러너가 없다(`pnpm test` 는 core · ui 만). `amountInput` 은 브라우저에서 확인 | 웹 러너 도입 시 |
| 200% 확대 · 색맹 시뮬레이션 | 돌리지 않았다 | `QA-001` 로그인 QA |

---

# 슬라이스 5 — 내 거래 미러 · 태그 확정 · 폼 한 줄 (2026-09-27)

| FR | 구현 | 확인 |
|---|---|---|
| FR-14 미러 섹션 · 격리 | `widgets/coach-console/ui/MirrorPanel.tsx` · `CoachReport.tsx`(리포트 `unavailable` 분기에도 게이지 + 미러) | Playwright — 리포트 · 게이지 `unavailable` 고정에서 미러가 그대로 보인다 |
| FR-15 미러 줄 | `entities/coach/ui/MirrorLines.tsx` · `model/mirrorMessages.ts` · `lib/format.ts`(`formatSignedDecimal` · `formatSignedKrw` · `formatShortDate`) | Playwright 1280 · 375 — 줄 다섯 + 표본 배지 · 표본 부족 배지 · 기준선 출처. 처음 본 화면에서 "표본 24 · 표본 부족"이 모순돼 보여 보유일 줄은 "익절 15 · 손절 9"로 고쳤다 |
| FR-16 엣지 없음 | `MirrorLines` `TagCostRows` — `noEdge` 인 줄만 배지 | Playwright — 추격(22건 · −0.8R)에만 |
| FR-17 태그 확정 | `features/confirm-outcome-tags/**` · `entities/coach/ui/OutcomeList.tsx` · `api/useBehaviorMirror.ts` | Playwright — "태그 고치기" → 체크박스 5 → 확정 → PUT → "확정했어요. 미러를 다시 셌어요". 375 에서 줄바꿈 |
| FR-18 엣지 없음 한 줄 | `entities/coach/ui/TradeBehaviorLines.tsx` · `RecordTradeCard.tsx`(`hasPlan`) · `useSizeCheck.ts`(키에 `hasPlan`) | Playwright(`/investments/BTC`) — 수량 · 단가 입력 → 요청 `hasPlan: false` → "이 거래는 '급등 추격' 후보예요 · 내 기록에서 이 유형 22건 평균 −0.8R(엣지 없음)". 저장 버튼 그대로 |
| FR-19 매도 프레이밍 | `TradeBehaviorLines` 매도 분기 | Playwright — 매도 전환 → "이 종목을 오늘 처음 본다면 살까요?" + "계획 손절 88,300,000원 · 지금 91,200,000원" |
| FR-20 행동 → 미러 줄 | `MirrorLines` "최근 행동" · `BehaviorFactList` 삭제 · `messages.ts` 쓰지 않는 문구 3개 삭제 | 타입 · 린트 — 소비처 0 확인 뒤 삭제 |

| 확인 | 결과 |
|---|---|
| 타입 · 린트 | `pnpm check-types` · `pnpm lint`(max-warnings 0) — 5 패키지 통과 |
| 테스트 | `pnpm test` — `@repo/ui` 43 · `@repo/core` 26 통과(웹 러너 없음) |
| 빌드 | `web` · `web-tax` `next build` 통과. dev 서버가 없는 상태에서 빌드했다(3000 · 3001 리슨 없음 확인) |
| 레이어 | `pnpm test:layer-check`(차단 8 · 통과 5) · Bash 로 쓴 파일 포함 변경 파일 전부에 `layer-check.mjs` 사후 실행 — 막힘 0 · 레지스트리(`layer-rules.cjs` · `fsd-features.md`)에 `confirm-outcome-tags` 추가 |
| 번들 | 첫 로드 `/coach/report` 110 kB · `/investments/[symbol]` 115 kB — 슬라이스 3 과 같다 |
| 접근성 | axe(미러 섹션 · 거래 폼) — **새 스타일 위반 0**. 걸린 것은 기존 둘: 공용 `panelDescription`(neutral 600, 리스크 예산 패널도 같은 위반) · `SegmentedControl` 안 고른 칸 4.18:1 |
| 공통 수용 기준 | 주문 경로 0 · 프론트 금액 계산 0(부호 · 퍼센트 포맷만) · 명령형 · 평가 문구 0(질문 한 줄은 시나리오 5 원문) · 막는 동작 0 · 3종 고지 고정 · 종목 자리에 아이콘 |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| 실 서버 값으로 미러 · 태그 · 폼 한 줄(로그인 상태) | 로컬 토큰 발급 불가 — Playwright 고정 응답으로만 확인 | `QA-001` 로그인 QA(사용자) |
| 사용자 정의 태그 새로 적기 | 입력 칸을 더하면 "추가 입력 2개 이내" 밖이다 — 이미 붙은 사용자 정의 태그는 보이고 끌 수 있다 | 사용 기록에서 5종으로 부족하다는 신호가 오면 |
| 매도 프레이밍의 "그냥 들고 있었으면 대비 +2.1%" 조각 | 매도 순간의 보유 대비는 서버에 없다(미러의 보유 대비는 전 기간 TWR) — 섞으면 다른 기간 숫자를 한 줄에 둔다 | 서버가 종목 단위 보유 대비를 주면 |
| 공용 `panelDescription` 대비(neutral 600) | 기존 — 모든 패널 설명 줄 공통. 한 곳을 고치면 전 화면이 바뀐다 | `@repo/ui` · surface 대비 정리 REQ |
| `SegmentedControl` 안 고른 칸 대비 4.18:1 | 기존(슬라이스 3 표에 이미 있음) | 같은 REQ |
| 월간 복기 카드 · 연승/연패(FR-20) · 시간대(FR-22) | 슬라이스 6 · Could | 복기는 슬라이스 6 · 연승/연패 · 시간대는 슬라이스 7 에서 닫힘 |
| 200% 확대 · 색맹 시뮬레이션 | 돌리지 않았다 | `QA-001` 로그인 QA |

---

# 슬라이스 6 — 월간 복기 · IPS 3문항 · 시나리오 · 진입 전 체크 (2026-09-27)

| FR | 구현 | 확인 |
|---|---|---|
| FR-21 월간 복기 | `widgets/coach-console/ui/MonthlyReviewPanel.tsx` · `entities/coach/ui/MonthlyReviewCard.tsx` · `api/useBehaviorMirror.ts`(`useMonthlyReview`, `keepPreviousData`) · `model/mirrorMessages.ts`(`REVIEW_MESSAGES`) | Playwright 1280 · 375 — 한 가지 문장 → 그달 거래 → 비용 태그 → 기준 넘은 날("지금 정해 둔 기준으로 셌어요") → 계획 지킴 → 익절 · 손절 → 들고 있었으면 → 회전율 → 채점. 달 고르기 → `?month=2026-07` 요청 → 머리 "2026년 7월" |
| FR-22 IPS 3문항 | `features/set-risk-budget/ui/RiskBudgetForm.tsx` · `lib/budgetInput.ts` · `model/messages.ts` | Playwright — 기준 없음 → 안내 + 펼침 · 월 허용 손실 % 로 바꿔 5 · 1회 500,000 · 상한 40 → PUT `{monthlyLossBudget:{0.05, percent}, perTradeMaxLoss:{500000, krw}, maxSingleAssetWeight:0.4}` → 게이지 "내 상한 40%". 1280 에서 원/% 가 칸 옆 한 줄 |
| FR-23 시나리오 | `entities/coach/ui/ScenarioList.tsx` · `RiskBudgetPanel.tsx` · `riskMessages.ts` | Playwright — 10 · 30 · 50% 줄 + 종목 몫 + FTX 구간 · 확률 문구 0 |
| FR-24 진입 전 체크 · Brier 줄 | `features/record-transaction/ui/EntryChecklist.tsx` · `RecordTradeCard.tsx`(`hasPlan` 에 프리모템) · `entities/coach/ui/MirrorLines.tsx`(`brierMirrorItem`) | Playwright(`/investments/BTC`) — 계획 펼침 → 진입 전 체크(Enter) → 질문 체크(초점 + Space) → 프리모템 → 기록 → POST `/trades` `plan{invalidation, checklist{shown:[chasing, off_plan], checked:[chasing]}}` → "계획도 함께 저장". 미러 채점 줄 "평균 점수 0.325 · 늘 50%라고 적었다면 0.25" + 빗나간 사례 |
| 검증 | — | `pnpm check-types` · `pnpm lint` · `pnpm test`(core 26 · ui 43) · `test:layer-check` · 변경 · 신규 파일 30개 레이어 훅 사후 실행 0 · `web` · `web-tax` 빌드 · 번들 `/coach/report` 110 kB · `/investments/[symbol]` 115 kB(변화 없음) · 375 가로 스크롤 없음 · 페이지 에러 0 |
| 접근성 | — | axe — 새 스타일 위반 0. 잡힌 대비는 전부 기존 공용(`panelDescription` · tertiary `Text` · `SegmentedControl` 비선택 · 종목 머리 · 차트 범례). 새 카드도 `panelDescription` 을 쓰므로 그 몫이 늘었다(아래) |
| 화면을 보고 고친 것 | — | ① 원/% 고르기가 1280 에서도 칸 아래로 떨어짐 → 칸이 남는 폭만 갖게 ② "내리면 얼마" 제목이 세리프(전역 `body` 글꼴 없음) → 글꼴 직접 ③ 체크박스가 `@repo/ui` 보라 → 태그 확정과 같은 무채색 네이티브(보라 선택 금지 결정) ④ vanilla-extract `& > li` 선택자 빌드 에러 → 클래스로 |

## 미검증 · 범위 밖 (슬라이스 6)

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실 토큰으로 서버 → BFF → 화면 | 로컬 토큰 발급 불가 — 고정 응답으로만 | `QA-001` 로그인 QA(사용자) |
| 공용 `panelDescription` · `SegmentedControl` 대비 | 기존 · 전 화면 공통. 이번 카드 설명 · 원/% 고르기도 같은 몫 | `@repo/ui` 대비 정리 REQ |
| 200% 확대 · 색맹 시뮬레이션 | 이번에 재지 않았다(원/% 고르기는 좁으면 줄바꿈하도록만 했다) | `QA-001` 로그인 QA 때 같이 |
| 코치 대화에서 3문항 · "내 미러 보여줘" | 대화 화면이 없다 — 게이지 패널에서 받는다(사용자 결정) | 코치 대화(F006)가 생길 때 |
| 오를 확률 입력 칸 | 추가 입력 2개 제한(사용자 결정) — 채점 줄은 API 로 적은 계획이 있을 때만 | 사용 신호가 오면 |
| 체크한 질문을 나중에 보여 주기 | 기록만 한다(FR-30). "내 계획" 카드에 표시하지 않았다 | 체크 기록과 결과의 관계를 복기에서 볼 때 |

---

# 슬라이스 7 — 미러 연승 · 연패 · 진입 시간대 · 요일 (2026-09-27)

| FR | 구현 | 확인 |
|---|---|---|
| FR-25 연승 · 연패 | `entities/coach/ui/MirrorLines.tsx`(`streakMirrorItem`) · `model/mirrorMessages.ts`(`streak`) · `@repo/core/coach` `behaviorMirror.ts`(`StreakView`) | Playwright 고정 응답 1280 — 태그 손익 다음 · 회전율 앞에 "지금 N연승이 이어지고 있어요" · 최장 줄 · `observed` 인 쪽만 "평소의 X배" 문장 + 금액 비교 한 줄. 표본 상태는 서버 `minSample` 로 |
| FR-26 진입 시간대 · 요일 | 같은 파일(`timingMirrorItem` · `TimingRows`) · `mirrorMessages.ts`(`timing`) · `TradeTimingView` | Playwright 고정 응답 1280 — 4구간 · 요일 줄(0건 칸 빠짐) · 줄마다 표본 부족 배지 · "날짜만 적은 거래 N건" 한 줄 |
| 검증 | — | `pnpm check-types` · `pnpm lint` · `pnpm test`(ui 43 · core 26) · `web` · `web-tax` 빌드 통과(워크트리 `next build` — `/coach/report` 110 kB · `/investments/[symbol]` 115 kB, web-tax 102 kB) |
| 문구 | — | 지시 · 평가 문구 0(`MIRROR_MESSAGES` 머리말 규칙) · 서버가 관찰됐다고 하지 않은 비율은 말하지 않는다 |

## 미검증 · 범위 밖 (슬라이스 7)

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실 토큰 · 실데이터로 서버 → BFF → 화면 | 로컬 토큰 발급 불가 · 로컬 DB 결정 결과 0건 — 고정 응답(가짜 계정 값)으로만 | 청산이 쌓인 계정으로 `QA-001` 로그인 QA(사용자) |
| 375 폭 · 200% 확대 · 대비 | 이번엔 1280 한 폭만 봤다 — 새 줄은 태그 손익과 같은 줄 모양 · 같은 스타일이다 | `QA-001` 로그인 QA 때 같이 |
| 월간 복기에 연속 · 시간대 | FEATURE-009 FR-28 항목이 아니다 — 미러에만 | 복기에서 보고 싶다는 신호가 오면 |

## F011 슬라이스 3b (2026-10-08, `137b876`)

| 항목 | 결과 |
|---|---|
| `RecordTradeCard` `assetType` · `tickSize` | 기본값 crypto — 코인 상세 Playwright 회귀: 계획 버튼 1 · 단위 "개" · 호가 안내 0 · 사이즈 계산 그대로 |
| 국내 주식 모드 | 계획 · 사이즈 계산 · 행동 줄 미렌더 · 사이즈 계산 요청 0 · 요청에 `assetType` · 계획 없음 · 404 문구(`FE-REQ-041` 체크리스트) |
| 무효화 | 기록 뒤 `portfolioQueryKeys.summary` 추가(코인에도) |
| 게이트 | check-types · lint · test · `test:layer-check` · 레이어 훅 사후 · `web` · `web-tax` 빌드 |

| 미검증 | 사유 | 언제 닫히나 |
|---|---|---|
| 떠 있는 BFF 경유 국내 주식 저장 | 4101 이 이 브랜치 전 코드 · 재시작 미허용 — 기록 경로는 고정 응답 | 다음 재시작 뒤 1건 |
