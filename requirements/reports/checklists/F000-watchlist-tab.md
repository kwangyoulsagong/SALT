# F000 관심 종목 탭 + FE-REQ-010 수리 — 검증 체크리스트

- 대상 슬라이스: `requirements/specs/in-progress/F000-watchlist-tab-slice.md`
- 브랜치: `feat/f000-watchlist-tab` (커밋 18개)
- 검증일: 2026-09-18
- 검증 환경: 로컬 풀스택 — Postgres 5432 · `salt-server` 4000 · `bff` 4001/4002/worker ·
  `apps/web` **3100**(3000 은 다른 프로젝트가 점유 중이었다)

> **범위가 두 번 넓어졌다.** ① 관심 종목 탭 수직 슬라이스 → ② 그 슬라이스가 남긴 빚 4건
> → ③ `FE-REQ-010` 의 나머지 수리 9건. 사용자가 각각 "다음 거", "미충족 다해"로 지시했다.

## 1. 수용 기준 — 관심 종목 탭 (슬라이스 문서)

| # | 기준 | 결과 | 근거 |
|---|---|---|---|
| 1 | 관심 종목 탭이 **빈 화면이 아니다** | **pass** | 탭 클릭 시 3행 렌더 |
| 2 | 종목명·심볼·현재가·변동률·자산군 배지·별 | **pass** | `비트코인 / BTC / 106,480,000 원 / +1.03 % / 크립토 / ★` |
| 3 | `priceStale: true` 면 "지연" 배지 | **pass** | AAPL 행에 `지연` + 현재가 `—` |
| 4 | 행 클릭 → 우측 프리뷰 교체 | **pass** | BTC 클릭 → 헤더·5분봉이 비트코인으로 |
| 5 | 키보드(Enter/Space) 선택 · `role`·`tabIndex` | **pass** | 3행 포커스 후 Enter → `aria-selected` 이동 |
| 6 | 실시간 탭 별과 같은 상태 | **pass** | 테더 별 클릭 → 서버 목록에 `USDT` 추가 → 재클릭 시 제거 |
| 7 | 별 버튼 `aria-label` | **pass** | `비트코인 관심 종목 제거` · `aria-pressed="true"` |
| 8 | 0건이면 빈 상태 + 더미 0건 | **pass** | "관심 종목이 없습니다 / 실시간 차트에서 별을 눌러 추가하세요" |
| 9 | 상승/하락 색 규칙 동일 | **pass** | 같은 `ChangeRateCell`·`PriceCell` |
| 10 | 서버 `currentPrice` 가 number\|null | **pass** | `106478000` · AAPL 은 `null` |
| 11 | 0건이면 BFF 빈 배열 | **pass** | `{"items":[]}` |
| 12 | 변경 금지 목록 유지 | **pass** | 5컬럼·필터 3그룹·blink·`limit=100`·PC 2컬럼 |
| 13 | 세 영역 빌드·타입체크·lint·layer-check | **pass** | §4 |

## 2. 수용 기준 — `FE-REQ-010` 수리 항목

| FR | 기준 | 결과 | 근거 |
|---|---|---|---|
| FR-1 | 관심 종목 탭 | **pass** | §1 |
| FR-2 | 표 헤더 시각이 하드코딩이 아니다 | **pass** | `"실시간 오늘 19:30 기준"` 제거, WS 수신 시각 / 미수신 시 "실시간 수신 대기 중" |
| FR-3 | 뉴스 프리뷰 실데이터 | **pass** | 실기사 제목·요약·출처·"55분 전". 크롤러로 324건 수집(BTC 66) |
| FR-4 | `덜 썻어요` 오타 | **pass** | 홈에 "20% 덜 썼어요" |
| FR-5 | 홈 "주식" 섹션 보유 요약 | **pass** | 비트코인 5,330,750원 +6.62% · 이더리움 4,093,200원 +6.59% · 합계 9,423,950원 |
| FR-6 · 60 · 61 | 터치/클릭·키보드 선택 · role·tabIndex | **pass** | 실시간 표 행에 `onClick`·`onKeyDown`·`tabIndex`·`aria-selected` (hover 유지) |
| FR-7 · 50~55 | 반응형 | **pass** | §3 |
| FR-8 · 50~52 | `period` 오타 · 422 | **pass** | 서버 `miniute` 422 · `minute` 200 · 생략 200 / BFF 동일 |
| FR-9 | 목표 저축 submit 연결 | **pass** | 폼 제출 → 서버에 `E2E 목표 \| travel \| 1,500,000 \| 2026-09-18 → 2027-09-18` |
| FR-40~45 | 뉴스 상세 규칙 | **pass** | 이미지 없으면 영역 미렌더 · 0건이면 문구 · 상대 시각 · 새 탭 + `noopener` · 블록 구조 유지 |
| FR-63 | `FilterTabs` 접근성 | **부분** | `role="group"` + `aria-label` + `aria-pressed`. **`tablist` 로 하지 않았다** — §5 |

## 3. 반응형 실측 (375 / 390 / 1440)

| 뷰포트 | `body` 가로 스크롤 | 배치 | 표 | 프리뷰 |
|---|---|---|---|---|
| 375 | **없음** (doc 375 = viewport) | 세로 | 자체 스크롤 · 컬럼 5개 유지 · 종목명 한 줄 | 아래로 접힘, 폭 295 |
| 390 | **없음** | 세로 | 동일 | 아래로 접힘, 폭 310 |
| 1440 | **없음** | 2컬럼 | 스크롤 없음 | 우측 500px (기존과 동일) |

측정은 같은 오리진 iframe(테두리 0)으로 뷰포트를 만들어 `documentElement.scrollWidth`
와 `innerWidth` 를 비교했다. **첫 측정에서 iframe 테두리 2px 이 뷰포트를 4px 갉아먹어
3px 초과로 보였다** — 측정 도구의 오차였고 테두리를 없애고 다시 쟀다.

## 4. 명령 결과

| 영역 | 명령 | 결과 |
|---|---|---|
| 서버 | `npm run build` · `lint` · `test:layer-check` | pass (차단 10 · 통과 6) |
| 서버 | `npm test` | **162건 pass** (기존 153 → ListWatchlist 6 · UpdateHoldingPrices 3) |
| BFF | `npm run build` | pass |
| BFF | `npm test` | **23건 pass** (러너 자체가 이번에 생겼다 — 이전 0건) |
| 프론트 | `check-types` · `lint`(`--max-warnings 0`) · `build` | pass |
| 프론트 | `pnpm test:layer-check` | pass (차단 8 · 통과 5) |
| `@repo/ui` | `check-types` · `lint` · `test` | pass (17건) |

## 5. 번들 (`pnpm build`, 기준선은 같은 브랜치 stash 빌드)

| Route | before | after | Δ First Load |
|---|---|---|---|
| `/investments` | 5.16 kB / **125 kB** | 3.86 kB / **125 kB** | **0** |
| `/home` | 2.3 kB / 135 kB | 4.09 kB / 136 kB | +1 kB |
| `/goals/addgoals` | 3.54 kB / 125 kB | 5.55 kB / 138 kB | +13 kB |
| `/` | 6.44 kB / 125 kB | 5.04 kB / 126 kB | +1 kB |
| 공통 청크 | 103 kB | 103 kB | **0** |

예산은 증가분 40 kB (`performance-frontend.md` §4).

> **두 번 회귀를 만들고 두 번 측정으로 잡았다.**
> ① `previewParams` 를 위젯 barrel 에 올려 `/investments` 125 → **178 kB**. 그 파일이
> 엔티티 barrel 을 import 해서 프리뷰·차트가 정적으로 딸려 왔다.
> ② 새 호출에 `axios` 를 써서 `/home` **158 kB** · `/goals/addgoals` **160 kB**.
> 두 화면 다 axios 를 쓰지 않던 곳이라 POST 하나에 라이브러리가 통째로 들어왔다 —
> 이미 있는 `apiFetch` 로 바꿔 각각 136 · 138 kB 로 되돌렸다.

## 6. 계약 동작 실측

| 경로 | 경우 | 결과 |
|---|---|---|
| `GET /api/app/watchlist` | 0건 / 크립토 / 주식 / 토큰 없음 | `{items:[]}` / 실가격 `priceStale:false` / `null` + `true` / 401 |
| `POST · DELETE /api/app/watchlist` | 추가 / 중복 / 제거 | 201 / **409 원 메시지 보존** / 204 |
| `GET /api/app/news` | 기사 있음 / symbol 누락 | 실기사 + `imageUrl:null` / 400 |
| `GET /api/app/portfolio/summary` | 보유 2건 | 이름 부착(비트코인·이더리움) · 합계 9,429,600 |
| `GET /api/investment/crypto/:s/chart` | `miniute` / `minute` / 생략 | 422 / 200 / 200 |
| `POST /api/goals` | 폼 제출 | 201, 서버에 1건 생성 |

## 7. 미충족 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `FilterTabs` 가 **`role="tablist"` 가 아니다** (FR-63 문구와 다름) | 이 버튼들은 탭이 아니다 — 대응하는 `tabpanel` 이 없고 화면을 바꾸지 않는다. `tablist` 로 선언하면 스크린리더가 "탭 1/5"이라 읽고 패널 전환을 기대한다. `role="group"`+`aria-pressed` 가 지금 동작을 정확히 말한다 | REQ 문구를 고치거나 `SegmentedControl` 로 교체할 때. **판단 근거는 컴포넌트 주석에 있다** |
| 목표 **목표일 기본 1년** | 폼에 날짜 입력이 없는데 서버가 요구한다. 화면에 한 줄로 노출은 했지만 **사용자가 고른 값이 아니다** | PM 이 기본값을 정하거나 폼에 입력을 추가할 때 |
| 목표 **카테고리 매핑이 임시** | 화면 6종과 서버 6종이 짝이 맞지 않아 겹치는 셋만 옮기고 나머지는 `other` | `goal` 컨텍스트 이관 |
| 새 목표가 **홈 목록에 안 보인다** | 저장은 서버, 조회는 아직 MSW(`/api/v1/goals`) | `FE-REQ-012`(조회 경로 BFF 이관) |
| 프리뷰 차트가 모바일에서 잘린다 | `PreviewChart` 가 생성 시점 폭(487px)으로 고정. **동작 확인된 변경 금지 코드** | F006 `FE-REQ-030` 또는 차트 리사이즈 별건 |
| 관심 종목 조회가 **서버 컴포넌트가 아니다** | 토큰이 `localStorage` 라 서버가 읽을 수 없다. 클라이언트 쿼리 + `ssr:false` | `FE-REQ-013`(쿠키 인증). 읽는 자리는 `shared/api/authToken.ts` 하나 |
| `/api/app/news` 가 **인증 없이 열린다** (`BFF-REQ-008` 표는 Auth Y) | 서버 `/news` 가 공개이고 같은 패널의 차트·심리도 공개다. 뉴스만 막으면 로그인 전 화면에서 그 블록만 빈다 | 서버가 뉴스를 비공개로 바꿀 때 |
| `fxRateUsed`·`fxBasisCode` 가 **언제나 null** | 보유가 전부 원화 크립토고 `fx` 컨텍스트가 없다 | F001·F002 |
| `AssetType` 3값 확장 | DB enum 이 2값 | `DB-REQ-001`/`003` |
| 목표 저축 · 홈 목표 카드의 조회 경로 | 이 슬라이스 범위 밖 | `FE-REQ-012` |
| 초대 코드 화면 (FR-20~26) | 별도 슬라이스 | `FE-REQ-011` 계열 |
| `grep "faskdljf"·"덜 썻어요"·"miniute"` 가 **0 이 아니다** | 셋 다 **"무엇을 고쳤는지" 설명하는 주석**에만 남아 있다. 렌더되는 코드에는 0건 | 유지 (주석을 지우면 왜가 사라진다) |
| 로컬 DB 검증 데이터 | `watchlist-check@local.test` + 관심 목록 2건 + 보유 2건 + 목표 1건 + 뉴스 324건 | 화면을 다시 볼 때 필요하다. 정리는 필요할 때 |

## 8. 이 검증에서 드러난 것 (코드가 아니라 **사실**)

- **`ListWatchlist` 응답이 화면이 쓸 수 없는 모양이었다.** Prisma `Decimal` 이 JSON
  문자열로 나갔다. 탭이 비어 있어서 아무도 몰랐다 — **소비처가 없는 계약은 검증되지 않는다.**
- **`/api/portfolio/internal/update-prices` 를 부르는 곳이 없었다.** 보유 평가금액이
  생성 이후 영원히 0 이었다. 홈 "주식" 섹션을 붙이려다 드러났다.
- 그 엔드포인트는 **심볼마다 조회를 돌았다.** 살리면 5초마다 100번 도는 구조였다.
- **주식에 업비트 로고 URL 이 붙었다.** API 응답만 보면 문자열이 들어 있어 정상으로 보인다 —
  브라우저를 열어야만 보이는 것이 있다.
- **목표 추가 제출이 `console.log` 두 줄이었다.** 폼은 완성돼 있었다.
- `TableRow` 는 `memoKey` 만 비교한다. 별 상태를 넣지 않으면 눌러도 그 행이 안 그려진다.
- **포트 3000 을 다른 프로젝트가 쓰고 있었다.** 우리 Next 는 `[::1]:3000` 에만 붙어서
  요청이 갈렸다(`curl` 은 남의 앱, 브라우저는 우리 앱). 3100 으로 옮겨 검증했다.
- **`next build` 를 dev 서버가 도는 중에 돌리면 `.next` 가 깨진다.** `_document` 를 못 찾는
  500 이 떴고 dev 재시작으로 복구했다.
