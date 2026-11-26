# FE-REQ-062 체크리스트 — 화면 움직임

2026-11-26 `feat/fe-req-062-interaction-motion` · zone 여섯 운영 빌드 · 설치 Chrome 헤드리스(Playwright, 1440 · `iPhone 13` 390) · 임시 계정 하나(초대 코드 → `qa062@example.com`, 목표 2 · 지출 9 — 끝나고 지움, 아래 정리).
측정 스크립트(누를 수 있는 요소 `a[href] · button · [role=button|tab|link|menuitem] · summary · label[for]` 의 계산된 `transition`)는 세션 scratchpad — 같은 15화면을 바꾸기 전 · 뒤로.

## FR

| FR | 결과 | 근거 |
|---|---|---|
| FR-1 호버 · 포커스 면 | 충족 | 전환 있는 비율 **296/668(44%) → 673/673(100%)** · `transition: all` **180 → 0**(투자 별 버튼 101 · 가계부 칩 41 · 설정 8 …) · 레이아웃 속성 전환 **2 → 0**(홈 진척 막대 `width`). 포커스 링 그대로(`outline` 안 건드림) |
| FR-1 기계 검사 | 충족 | `@repo/ui` `motionBudget.test.ts` 18 — 경계 표(통과 7 · 막음 8) · 파일 모양(인라인 객체 · 주석 · 여러 줄) · 레포 전체 0. **변이 3/3 잡힘**(칩 길이만 · 칩 `all` · 가계부 `width` — scratchpad 사본으로 되돌림, `cmp` 같음) |
| FR-2 눌림 | 충족 | `/goals` 버튼 누른 채 `scale` 0.97 · 놓으면 1 · 줄인 모션 `none`. 버튼 · 아이콘 버튼 · 목록 행 · 데스크톱 전역(버튼 · 접힘 머리) |
| FR-3 등장 | 충족 | `/household` 본문 `li` · `/investments` 표 `tr` 애니메이션 `rowIn` · 지연 0 → 20 → … → 160ms(9행부터 같이) · 줄인 모션 `none` · 첫 1.2초 프레임 72 · 20ms 넘는 프레임 0 · 최대 17ms |
| FR-4 스켈레톤 반짝임 | 충족 | 가계부 예산 요청 2.5초 늦춤(`route`) — `[data-skeleton]::after` 애니메이션 돎 · 줄인 모션이면 띠 `display: none`(옅은 면만) |
| FR-5 숫자 | 충족 | `/household` "바로 적기" 45,000원 · 식비 → 주인공 **199,500 → 244,500원 15프레임**(202,597 · 218,424 · …) · 첫 렌더는 글자 그대로. `parseAmount.test.ts` — 굴리는 글자 · 안 굴리는 글자(실패 문장 · 소수 · 단위 앞) 경계 |
| FR-6 막대 | 충족 | `ProgressBar` 채움 `translateX() scaleX()`(전환 `transform`) · 처음 `growInX` · 저축 목표 진척 · 봉투 · 분류 비율 · 날마다 · 만족 거울 · 홈/휴대폰 미리보기 · 근거 분포 · 한 장 패널 막대 · 비교 막대 — 레이아웃 속성 전환 0(위 FR-1) |
| FR-7 차트 선 | 충족 | `TradingChart` 기본 캔버스 그리기 횟수 0.15초마다 `6 15 24 33 42 51 56 56 …` — 0.9초 동안 그리고 멈춤(십자선은 오버레이만 그대로) · 줄인 모션 1회. 홈 `Sparkline` · 투자 `PreviewChart` 바깥 `<svg>` `clip-path` 드러남 → 끝나면 `none` · 종목 바꾸면 다시(`running`). `reveal.test.ts` 3 |
| FR-7 레이아웃 | 고침 · 충족 | 처음 구현(자르는 `clipPath` 사각형 `scaleX`)이 투자 표 호버 12행 동안 **레이아웃 70 → 248**(SVG 안 변형 = 매 프레임 레이아웃, 트레이스). 바깥 `<svg>` `clip-path` 로 바꿔 **54(전환 끔) ↔ 48(지금)** |
| FR-8 탭 · 세그먼트 | 충족 | 투자 표 "정렬 기준" 고른 면 프레임마다 x `2 4 7 73 88 98 104 108 110 111` · 줄인 모션 전환 `none`. 결함 고침 — 필터가 대기 분기에 같이 갈아 끼워져 다시 마운트(미끄러짐 0 · 깜빡임) → 필터를 분기 밖으로. 같은 원인 호출처 grep 22곳 — 나머지는 필터가 분기 밖 |
| FR-9 페이지 사이 | 충족 | `/household` → `/household/month/2026-10` 클릭 80ms 뒤 `main` 애니메이션 `0 > 1` · 휴대폰 `/m/home` → `/m/goals` 1건 · 첫 마운트 0 · 줄인 모션 0 |
| FR-10 토큰 | 충족 | `duration.hover` · `loop` · `easing.standard` · `staggerRow` · 옛 `transitions` 지움 — `motion.md` §3 표 · §3-1 바닥 표 · `style-tokens.md` |

## 지키는 것

| 항목 | 결과 |
|---|---|
| `transform` · `opacity` 만 | 전환 · 등장 · 막대 · 반짝임 · 미끄러짐 · 본문 투명도 = `transform`/`scale`/`opacity`. 예외 둘 — 면 · 글자색 전환(칠하기, 레이아웃 0 — 호버 6 · 12행 레이아웃 +0 · 가계부 · 목표), SVG 드러남 `clip-path`(레이아웃 0, 위 FR-7) |
| 가격 · 등락률 굴림 · 깜빡임 0 | `RolledText` 는 요약 주인공 금액만(`SummaryBand` · `MobileSummary` · 홈 카드). 시세 표 · 상세 가격은 그대로 |
| 수익 축하 · 판정 맥박 0 | 새 반복 애니메이션은 스켈레톤 반짝임(로딩)뿐 |
| 서버 HTML 끝 상태 | CSS 애니메이션 · 첫 렌더 글자 그대로 — 수화 오류 0(페이지 오류 · 콘솔 오류 0, 아래 404 는 기존) |
| 휴대폰 `/m` | 390 4화면 가로 넘침 0 · 오류 0 · 누름 규칙(`MobileShell.css.ts`) 그대로 — 데스크톱 전역은 `html:not([data-surface="mobile"])` 라 안 닿음 |

## 명령

| 명령 | 결과 |
|---|---|
| `pnpm check-types` · `pnpm lint` | 14/14 · 14/14 |
| `pnpm test` | core 413 · ui 132 · web-shared 40 · web 10 · household 9 · tips 12 |
| `pnpm --filter @repo/ui build-storybook` | 통과(`RolledText` 이야기 셋) |
| `pnpm test:layer-check` · Bash 로 쓴 파일 레이어 훅 사후 | 22 · 15 통과 · 위반 0 |
| zone 여섯 운영 빌드 | Ready |
| `node scripts/check-done.mjs` | 통과 |

## 정리

임시 계정 `DELETE /api/app/me` 200 · 초대 코드 지움 — `identity.users` 그 이메일 0 · `invite_codes` 0(2026-11-26 확인).

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실기기 누름 · 등장 손맛 | Playwright 는 `:active` 를 흉내만 낸다(`mobile-motion.md` §5) | `QA-001` Q-8(사용자 휴대폰) |
| 기존 404 `/api/app/coach/events?symbol=BTC` | 소유자 아닌 계정의 기존 응답 — 이번 변경 밖(API) | 이 REQ 범위 밖 · 그대로 |
| 화면 밖 막대 "보일 때" 차오름 | 정정 — "처음 그릴 때"로(스펙 Changelog 2026-11-26) | — |
