# F000 관심 종목 탭 — 검증 체크리스트

- 대상 슬라이스: `requirements/specs/in-progress/F000-watchlist-tab-slice.md`
- 브랜치: `feat/f000-watchlist-tab`
- 검증일: 2026-09-18
- 검증 환경: 로컬 풀스택 — Postgres 5432 · `salt-server` 4000 · `bff` 4001/4002 · `apps/web` 3000

## 1. 수용 기준

| # | 기준 | 결과 | 근거 |
|---|---|---|---|
| 1 | 관심 종목 탭이 빈 화면이 아니다 | **pass** | 탭 클릭 시 3행 렌더 (스크린샷) |
| 2 | 종목명·심볼·현재가·변동률·자산군 배지·별 | **pass** | `비트코인 / BTC / 106,480,000 원 / +1.03 % / 크립토 / ★` |
| 3 | `priceStale: true` 면 "지연" 배지 | **pass** | AAPL 행에 `지연` 배지 + 현재가 `—` |
| 4 | 행 클릭 시 우측 프리뷰가 그 종목으로 | **pass** | BTC 행 클릭 → 프리뷰 헤더·5분봉 차트가 비트코인으로 교체 |
| 5 | 키보드(Enter/Space)로 선택, `role`·`tabIndex` | **pass** | 3행 포커스 후 Enter → `aria-selected` 가 3행으로 이동. 전 행 `tabIndex=0` |
| 6 | 실시간 탭 별과 관심 목록이 같은 상태 | **pass** | 실시간 탭에서 BTC·ETH만 채워진 별. 테더 별 클릭 → 채워짐 + 서버 목록에 `USDT` 추가. 다시 클릭 → 제거 |
| 7 | 별 버튼에 `aria-label` | **pass** | `비트코인 관심 종목 제거` · `aria-pressed="true"` |
| 8 | 0건이면 빈 상태 + 더미 0건 | **pass** | "관심 종목이 없습니다 / 실시간 차트에서 별을 눌러 추가하세요" |
| 9 | 상승/하락 색 규칙이 실시간 테이블과 같다 | **pass** | 같은 `ChangeRateCell`·`PriceCell` 컴포넌트를 쓴다 |
| 10 | 서버 `currentPrice`·`priceChange24h` 가 number\|null | **pass** | `{"currentPrice": 106478000, "changeRate": 1.02660443}` · AAPL 은 `null` |
| 11 | 0건이면 BFF 가 빈 배열 | **pass** | `{"items":[]}` |
| 12 | 변경 금지 목록 (5컬럼·필터 3그룹·blink·`limit=100`·2컬럼) | **pass** | 실시간 탭 스크린샷에서 컬럼 5·정렬 5·순서 2·기간 7·2컬럼 배치 그대로 |
| 13 | 세 영역 빌드·타입체크·lint·layer-check | **pass** | 아래 §2 |

## 2. 명령 결과

| 영역 | 명령 | 결과 |
|---|---|---|
| 서버 | `npm run build` | pass |
| 서버 | `npm test` | **159건 pass** (기존 153 → ListWatchlist 6건 추가) |
| 서버 | `npm run lint` | pass |
| 서버 | `npm run test:layer-check` | pass (차단 10 · 통과 6) |
| BFF | `npm run build` | pass |
| 프론트 | `pnpm --filter web check-types` | pass |
| 프론트 | `pnpm --filter web lint` | pass (`--max-warnings 0`) |
| 프론트 | `pnpm --filter web build` | pass |
| 프론트 | `pnpm test:layer-check` | pass (차단 8 · 통과 5) |

## 3. 계약 동작 실측 (BFF `/api/app/watchlist`)

| 경우 | 기대 | 실측 |
|---|---|---|
| 목록 0건 | `{ items: [] }` | 일치 |
| 추가 | `201` | 일치 |
| 중복 추가 | 서버 `409` 를 그대로 | `409 {"message":"Already in watchlist"}` |
| 제거 | `204` | 일치 |
| 토큰 없음 | `401` | 일치 |
| 크립토 | 실가격 + `priceStale: false` | `106,478,000` · `false` |
| 주식(AAPL) | 가격 `null` + `priceStale: true` | 일치 |

## 4. 번들 (`pnpm --filter web build`, 기준선은 같은 브랜치의 stash 빌드)

| Route | before | after | Δ First Load |
|---|---|---|---|
| `/investments` | 5.16 kB / **125 kB** | 5.28 kB / **125 kB** | **0** |
| `/` | 6.44 kB / 125 kB | 6.5 kB / 126 kB | +1 kB |
| `/home` | 2.3 kB / 135 kB | 2.34 kB / 135 kB | 0 |
| 공통 청크 | 103 kB | 103 kB | **0** |

예산은 증가분 40 kB (`performance-frontend.md` §4). 관심 종목 탭 코드는 `next/dynamic`
청크에 있어 First Load 에 들어가지 않는다.

> **중간에 회귀를 만들었고 측정으로 잡았다.** `previewParams` 를 위젯 `model` barrel 에
> 올렸더니 `/investments` 가 **125 → 178 kB** 가 됐다 — 그 파일이 `@/entities/market` 를
> import 해서, barrel 을 쓰는 `MarketBoard` 가 프리뷰·차트를 정적으로 끌어왔다. 잎에서
> `../model/previewParams` 로 직접 가져가게 바꿨다.

## 5. 미충족 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `FE-REQ-012` 호출 배치의 "관심 종목 = **서버 컴포넌트**" | 토큰이 `localStorage` 에 있어 서버 컴포넌트가 읽을 수 없다. 클라이언트 쿼리 + `ssr:false` 로 구현했다 | `FE-REQ-013` (쿠키 인증). 읽는 자리는 `shared/api/authToken.ts` 하나다 |
| 관심 목록 **100건 초과** 시 별 동기화 | BFF 가 `limit=100` 으로 한 번만 읽는다. 101번째부터는 실시간 탭 별이 빈 채로 남는다 | 사용자 ≤10명 · 종목 100개 상한이 실질 제약. 초과 사례가 생기면 커서 페이징 |
| 목록 밖(시세 100위 밖) 심볼의 **우측 프리뷰** | 프리뷰가 시세 목록의 한 줄을 받는다. 주식·저순위 종목은 그 줄이 없어 패널이 빈다 | F006 `FE-REQ-030` (프리뷰를 자체 조회로 바꿀 때) |
| **BFF 자동 테스트 0건** | `bff` 에 테스트 러너가 없다(`package.json` 에 `test` 스크립트 없음) | 별건. `priceStale` 판정은 수동 실측으로만 검증했다 |
| `priceStale` 임계값 60초의 **근거 측정** | 워커 주기(5초)의 12배로 정했고 실측 분포를 보지 않았다 | 관측 수단이 생길 때 (`BFF-REQ-010` PERF) |
| `AssetType` 3값 확장 | DB enum 이 2값이다 | `DB-REQ-001`/`003` |
| 뉴스 프리뷰 실데이터 · 하드코딩 시각 · 오타 · 반응형 · `period` 오타 · 실시간 테이블 `onClick`(FR-6) · `FilterTabs` `role="tablist"`(FR-63) | 같은 REQ 안이지만 이 슬라이스가 아니다 | `FE-REQ-010` 의 나머지 FR |
| 375/390/1440 **3뷰포트 검수** | 이 슬라이스가 반응형(FR-7·50~55)을 범위 밖으로 뒀다. 1512px 하나에서만 봤다 | `FE-REQ-010` FR-54 |
| 로컬 DB 에 남은 검증용 데이터 | `watchlist-check@local.test` 계정 + BTC·ETH 관심 목록 2건을 남겼다. 화면을 다시 볼 때 필요하다 | 정리 시 계정 삭제 |

## 6. 이 검증에서 드러난 것

- **`ListWatchlist` 응답이 원래 화면이 쓸 수 없는 모양이었다.** Prisma `Decimal` 이 JSON
  문자열로 나갔고(`"158000000"`), BFF 는 그것을 그대로 전달했다. 탭이 비어 있어서 아무도
  몰랐다 — **소비처가 없는 계약은 검증되지 않는다.**
- **주식에 업비트 로고 URL 이 붙었다.** `logoUrlOf(symbol)` 를 자산군과 무관하게 적용해
  `logos/AAPL.png` 404 가 화면에 깨진 이미지로 나갔다. 브라우저 확인에서만 드러났다 —
  API 응답만 봤으면 문자열이 들어 있으니 통과로 읽었을 것이다.
- **`TableRow` 는 `memoKey` 만 비교한다.** 별 상태를 `memoKey` 에 넣지 않으면 별을 눌러도
  그 행이 다시 그려지지 않는다(가격이 다음 틱에 바뀔 때에야 반영된다).
