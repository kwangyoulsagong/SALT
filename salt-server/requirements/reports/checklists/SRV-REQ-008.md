# SRV-REQ-008 (F000 FUNC) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/SRV-REQ-008-F000-FUNC.md`
- 브랜치: `feat/f000-watchlist-tab` → `feat/f000-invite-onboarding-slice` · 검증일: 2026-09-18
- 상태: **부분 완료** — 관심 목록·뉴스·차트·포지션 요약에 이어 **초대 코드·인증 축소·온보딩 상태**가 닫혔다. 알림 2종·동면·`AssetType`·환율이 남았다
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

## 5. 초대 코드 · 인증 축소 (2026-09-18, `feat/f000-invite-onboarding-slice`)

전 영역 통합 기록은 루트 `requirements/reports/checklists/F000-invite-onboarding.md` 다.

| FR | 내용 | 결과 | 근거 |
|---|---|---|---|
| FR-1 | 검증 4개(존재·미사용·미만료·상한) | **pass** | `domain/policy/inviteAcceptance` 한 곳. 유닛 5건 |
| FR-2 | 도메인 예외 4종이 `code` + `ErrorKind` | **pass** | 넷 다 `Forbidden`(403). status 로 나누면 그 자체가 무차별 대입의 신호가 된다 |
| FR-3 | `UserCountProbe` 경유 | **pass** | `grep "prisma" src/auth/domain` = 0 |
| FR-4 | 원자적 사용 | **pass** | 실제 DB 동시 2요청 → 201 + 403. `redeem` 이 조건부 UPDATE + INSERT 를 한 트랜잭션에 |
| FR-5 | `register` 유스케이스 0건 | **pass** | **계정을 만드는 함수가 `InviteCodeStore.redeem` 하나**이고 코드 점유 없이 성공하지 않는다 |
| FR-6 | 상한이 설정값 | **pass** | `INVITE_MAX_ACCOUNTS`(기본 10). `=3` 으로 기동해 정원 초과 재현 |
| FR-7 | 실패 시도 기록 · **잠금 없음** | **pass** | `invite_code_attempts`. 코드 앞 4자만 저장. 기록 실패가 가입을 막지 않는다 |
| FR-10 | `Login`·`RefreshSession` 유지 | **pass** | 새 계정으로 로그인 200 |
| FR-11 | `Register`·`ChangePassword`·`DeleteAccount` 제거 | **pass** | 셋 다 404. `modules/auth` 삭제 |
| FR-12 | 토큰 재발급 유지 | **pass** | `POST /api/auth/refresh` |
| FR-13·14 | 온보딩 3단계 · 공개 API 경유 | **부분** | 판정은 `onboarding` 조합 컨텍스트에 있다. **소스가 REQ 와 다르다** — §6 |

## 6. FR-14 가 지정한 소스를 쓰지 못했다

`ledger`(F001)·`plan`(F003) 둘 다 없다. `onboarding` 은 프로브 둘을 주입받고 조립
지점에서 지금 있는 것을 꽂는다.

| 스텝 | REQ 가 말한 소스 | 지금 꽂은 것 | 언제 바뀌나 |
|---|---|---|---|
| `link_account` | `ledger` 거래 존재 | `portfolio.countTransactions > 0` | F001 |
| `set_plan` | `plan` 설정 존재 | `goal` 행 존재 (**`composition.ts` 가 Prisma 로 직접 센다**) | F003 |

**판정 규칙은 컨텍스트 안에 그대로 있다.** 바뀌는 것은 조립 두 줄이다.

## 7. `ErrorKind` 에 `Unauthenticated` 를 더했다

`modules/auth` 의 `UnauthorizedError`(401)를 옮길 자리가 커널에 없었다. 없는 채로
진행하면 로그인 실패·토큰 만료가 403 이 되고, 그건 이관이 아니라 **계약 변경**이다.
403 과 나뉘어 있어야 클라이언트가 토큰 재발급을 시도할지 판단할 수 있다.
`Forbidden` 이 들어올 때와 같은 이유이고, 같은 기준(전 컨텍스트에 걸리는가)을 통과한다.

## 8. 명령 (이 슬라이스)

| 명령 | 결과 |
|---|---|
| `npm run build` · `lint` | pass |
| `npm test` | **184건** (162 → +22: 초대 판정 9 · 유스케이스 9 · 온보딩 4) |
| `npm run test:layer-check` | pass (차단 10 · 통과 6) |
| `npx prisma migrate dev` | `20260918071852_add_invite_code` |
