# SRV-REQ-008 (F000 FUNC) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/SRV-REQ-008-F000-FUNC.md`
- 브랜치: `feat/f000-watchlist-tab` · 검증일: 2026-09-18
- 상태: **부분 완료** — 관심 목록·뉴스·차트·포지션 요약이 닫혔고 초대·인증·알림·동면이 남았다
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-watchlist-tab.md`

## 1. 닫힌 것

| FR | 내용 | 결과 | 근거 |
|---|---|---|---|
| FR-30 | watchlist CRUD 가 `market` 컨텍스트에, **동작 불변** | **pass** | 이관은 `SRV-REQ-006` 에서 끝나 있었다. 동작 변경 0 |
| FR-31 | `@@unique([userId, assetType, symbol])` 유지 | **pass** | 스키마 그대로 |
| FR-33 | 목록에 현재가·변동률 포함 | **pass** | 행 값과 `market_assets` 저장 시세 중 **`priceUpdatedAt` 이 늦은 쪽**. 테스트 6건 |
| FR-40~44 | 심볼별 뉴스 · 최신순 · 상한 · 빈 배열 · 크롤러 유지 | **pass** | 조회는 이미 있었고 **소비처가 이번에 생겼다**. 크롤러로 324건(BTC 66) |
| FR-50~52 | `period` 유효값 · 모르는 값 **422** | **pass** | `miniute` 422 · `minute` 200 · 생략 200 |
| FR-60 | 보유 요약(종목·평가금액·손익률·자산군) | **pass** | `GET /api/portfolio/summary` |
| FR-63 | Projection 조회, Aggregate 미로드 | **pass** | `findByUser` 읽기 쿼리 |

## 2. 남은 것

| FR | 내용 | 언제 닫히나 |
|---|---|---|
| FR-1~7 | 초대 코드 도메인(`AcceptInviteCode` · 예외 4종 · `UserCountProbe` · 원자성 · 상한 설정값) | `DB-REQ-001`(`InviteCode`) 선행 |
| FR-10~14 | 인증 축소 · 온보딩 상태 3단계 | `ledger`·`plan` 공개 API 선행 (F001·F003) |
| FR-20~25 | 알림 2종 제한 · `kindGate` | `notification` 컨텍스트 이관 |
| FR-32 | `AssetType` 3값 | `DB-REQ-001`/`003` (`ALTER TYPE` 락 측정 포함) |
| FR-61·62 | 3자산군 원화 합산 · 환율 기준 | `fx` 컨텍스트 (F001·F002). 지금은 필드만 두고 `null` |
| FR-70~72 | 동면 4종 · 되살리기 테스트 | `SRV-REQ-007` |

## 3. 구현 중 드러난 사실

- **`ListWatchlist` 가 Prisma `Decimal` 을 그대로 내보냈다.** JSON 에서 문자열로 나가
  화면이 숫자로 쓰면 죽는다. 어댑터에서 변환하도록 고쳤고 `null` 은 `null` 로 둔다
  (0 으로 떨어뜨리면 "가격이 0원"이 된다).
- **`/api/portfolio/internal/update-prices` 를 부르는 곳이 없었다.** 보유 평가금액이
  생성 이후 영원히 0 — 홈 "주식" 섹션이 0원만 나오는 원인이었다.
- 그 유스케이스가 **심볼마다 조회를 돌았다.** 밀어 넣는 쪽은 구독 전체(100+)를 5초마다
  보내는데 보유는 몇 건이다 — 한 번 읽고 해당 보유만 갱신하도록 바꿨다(`findBySymbols`).
  테스트 3건이 "심볼 100개여도 조회 1회"를 고정한다.
- 주식에 **업비트 로고 URL** 을 붙이고 있었다(`logos/AAPL.png` 404). 자산군이 크립토일
  때만 만들고 나머지는 `null` 이다 — 플레이스홀더를 만들지 않는다.

## 4. 명령

`npm run build` pass · `npm test` **162건 pass**(기존 153 → ListWatchlist 6 · UpdateHoldingPrices 3)
· `npm run lint` pass · `npm run test:layer-check` pass (차단 10 · 통과 6).
