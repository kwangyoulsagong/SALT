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
| 실 서버 값으로 화면(로그인 상태) | 로컬 토큰 발급 불가 — Playwright 고정 응답으로만 확인 | 로그인 QA(사용자) |
| 거래 1건 + 계획 30초(사람 5회 평균) | 사람이 재야 한다 | 로그인 QA |
| 매입가 숨김 토글(FR-13) | 웹에 평단 · 손익률을 보이는 화면이 없다 | 포지션 화면(`position-overview`) 생길 때 |
| 손절 % 프리셋(−5/−8/−10%) | 가격 × 비율 = 프론트 금액 계산 | 서버가 프리셋 가격을 주면(`SRV-REQ-038` 후속) |
| 손절까지 거리(원) · 4주 도달 확률 | 서버 필드 없음 · 도달 확률은 F008 소유자 전용 | 서버가 거리 필드를 주면 · F008 FR-7 연동 |
| 예산 % 단위 입력 · 목표 변동성 입력 | 원만 받는다 | 슬라이스 6(코치 대화 3문항과 같이) |
| `SegmentedControl` 안 고른 칸 대비 4.18:1 | 기존 `@repo/ui` 스타일 — 모든 화면 공통 | `@repo/ui` 대비 정리 REQ |
| 전역 글꼴 없음(`body` 에 `font-family` 없음 → 세리프) | 기존. 새 카드는 토큰 글꼴을 직접 갖게 했다 | 전역 스타일 결정(사용자) |
| 마지막 수정 뒤 `next build` 재실행 | dev 서버와 `.next` 를 같이 쓴다 — 도는 중에 빌드하면 dev 가 깨진다 | 머지 전 dev 를 내리고 한 번(작성자) |
| `apps/web` 단위 테스트 | 러너가 없다(`pnpm test` 는 core · ui 만). `amountInput` 은 브라우저에서 확인 | 웹 러너 도입 시 |
| 200% 확대 · 색맹 시뮬레이션 | 돌리지 않았다 | 로그인 QA |
