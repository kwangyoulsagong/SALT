# F011 슬라이스 — 미래 휴장일(FR-14) · KRX 휴장일 공시 표 — 체크리스트

슬라이스: `requirements/specs/in-progress/F011-fr14-future-holidays-slice.md` · 2026-10-30
브랜치: `feat/f011-fr14-future-holidays` (base `main` `6929834c`)
영역 체크리스트: `salt-server/requirements/reports/checklists/SRV-REQ-040.md` · `DB-REQ-033.md` ·
`salt-forecast/requirements/reports/checklists/FC-REQ-009.md` · `FC-REQ-020.md` · `bff/requirements/reports/checklists/BFF-REQ-040.md` ·
`salt-microFe/requirements/reports/checklists/FE-REQ-041.md`

## 1. 확인

| 확인 | 결과 |
|---|---|
| 공시 표 ↔ 역산(지난날) | 2026-01-01~10-29 평일 휴장 15일 — 일봉 역산(`source = candles`, 휴장 행)과 날짜까지 같다. 실서버 동기화 로그에 어긋남 경고 0 |
| 실서버 동기화 | launchd 재시작 → 부팅 회차 `🗓️ KRX 달력(역산): 522일 · 휴장 36 · 오늘 true · 공시 46일(휴장 3, ~2027-01-01)`(KIS 는 여전히 `EGW02004`) |
| 출처 우선순위 | 오늘(10-30) 행은 `probe` 그대로 — 공시가 덮지 않았다. `krx_notice` 45행 = 11-02 ~ 2027-01-01, 휴장 3(12-25 · 12-31 · 01-01) |
| 장 상태(실 DB, 시각 주입) | 11-02 08:00 `closed` · `calendarKnown` 참 / 12-24 16:30 다음 개장 **12-28** / 12-25 10:00 `holiday` · 다음 12-28 / 12-30 16:30 다음 개장 **2027-01-04** / 2027-01-05 `calendarKnown` 거짓(표 밖 — 추정 그대로) |
| 백업 | 적용 전 `market_holidays` 540행 CSV(scratchpad, 세션 임시). 되돌리기 = `DELETE FROM market_holidays WHERE source = 'krx_notice'` |
| 예측 달력 동일성 | `load_kr(as_of 10-30)` 거래일 배열 = 공시 행을 뺀 표로 만든 배열(1,237개 · 마지막 10-30) **완전 동일**. main 의 자르지 않는 읽기는 1,279개 · 마지막 12-30 — `presumed_weekdays` 가 꺼진다(같은 PR 이어야 하는 이유) |
| 예측 dry-run 전후 | `kr_daily`(예측 400 · 대기 19,044 · 채점 0) · `kr_volatility`(2,611행) — 공시 행 쓰기 전후 같은 수. `reports/` 새 파일 0 |
| 서버 게이트 | `prisma:generate` · `build` · `lint` · `test` 867 fail 0(새 9: 도메인 6 · 동기화 3) · `test:layer-check` 통과(차단 10 · 통과 6) |
| 예측 게이트 | `ruff check` · `ruff format --check` · `pyright` 0 · `lint-imports` 3 kept · `pytest` 통과 · `pytest tests/leakage` 통과 |
| 스키마 | 주석만(`source` 값 목록) — 마이그레이션 0 · `prisma:generate` 확인 |

## 1-1. 낡은 문장 정정

| 곳 | 정정 |
|---|---|
| `coach/domain/policy/krStockJudgment.ts` `isKrExitSettled` 주석 | "미래 휴장을 몰라 시간으로" → 코치는 `market` 개장일 표를 읽지 않아 시간으로(서비스 경계) — 결과 같고 휴장 만기만 사흘 늦다. 코드 무변경 |
| `SRV-REQ-040` 체크리스트 범위 밖 "미래 평일 휴장 채점" | 닫힘 — 결과 동일 · 바꾸지 않음(판단) |
| `F011-slice0-1-kis-foundation-slice.md` 7번 | "미래는 `calendarKnown=false`" → 공시 표 · 표 밖만 |

## 2. 짝 영역 — 변경 없음

| REQ | 왜 안 바뀌나 |
|---|---|
| `BFF-REQ-040` FR-1 | `calendarKnown` 을 그대로 옮긴다 — 값이 참인 때가 늘어날 뿐 모양 무변경 |
| `FE-REQ-041` FR-41 | `KrSessionLine` 의 "달력 추정" 표시는 `calendarKnown` 거짓일 때만 — 평일 아침 · 공시가 덮는 날에 덜 나온다. 코드 무변경 |
| `SRV-REQ-008` | `schema.prisma` 첫 REQ 언급일 뿐 — 바꾼 줄은 `MarketHoliday`(주인 `DB-REQ-033`) 주석 |

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~평일 아침 실화면 "달력 추정" 사라짐~~ | ~~지금은 오후~~ **정정 2026-10-30 같은 날 후속** 닫음 — §4 | — |
| ~~휴장 사유 이름~~ | ~~응답 · BFF · 화면 계약 변경~~ **정정 2026-10-30 같은 날 후속** 닫음 — §4 | — |
| 2027 휴장일(신정 외) | KRX 공시 전 | 2026-12 공시 뒤 · 12-01 부터 경고 로그 |

## 4. 후속 — "검증안한거 다해" (2026-10-30)

| 확인 | 결과 |
|---|---|
| 휴장 사유 이름(FR-41) | 서버 `holidayName`(공시 표 이름 · 주말 · 장날 · 표에 없는 임시 휴장은 `null`) → BFF `toKrSessionVM`(옛 응답 `null` · 문자열 아니면 계약 깨짐) → 웹 `KrSessionLine` "휴장일(성탄절)". 테스트 서버 868 · BFF 298 · 웹 `@repo/core` 51 · `@repo/ui` 43 pass · 모노레포 `check-types` · `lint` · 훅 exit 0 |
| 실서버 → BFF(HTTP, 오늘) | 상시 서버 재시작 뒤 `/api/market/kr/session` · `/api/app/market/kr/session` 둘 다 `calendarKnown: true` · `holidayName: null`(소유자 이메일 토큰 — 사용자 행 없음, 토큰 파일 세션 임시) |
| 미래 시각 — 실 유스케이스 · 실 DB | `GetKrMarketSession` 에 `now` 주입 → BFF 파서: 11-02 08:00 `closed` · 추정 아님 · 다음 개장 그날 09:00 / 12-24 16:30 다음 개장 12-28 / 12-25 10:00 `holiday` · "성탄절" · 다음 개장 12-28 |
| 실화면(웹 dev 3100, Playwright) | 실 BFF 응답의 장 상태 칸만 위 결과로 교체, 나머지 실데이터. `/investments/005930` 장 상태 줄 — 오늘 "정규장 아님 · 시간외 단일가 · 마지막 체결 15:30 · 다음 개장 월요일 09:00" / 11-02 아침 "… 장 마감 · 마지막 체결 10/30 15:30 · 다음 개장 오늘 09:00" / 12-24 "… 다음 개장 월요일 09:00" / 12-25 "정규장 아님 · 휴장일(성탄절) · 마지막 체결 12/24 15:30 · 다음 개장 월요일 09:00". 넷 다 "추정" 표시 없음 · 페이지 오류 0 |
| 114800 10-29 2봉 | 결함 아님 — KODEX 인버스(ETF, `EF`). 10-29 10:35~10:40 봉만, 지금 관심 · 보유 0 · 일봉 0. 그 시각 F009 확인용 임시 사용자가 보유했다가 삭제됨(`FE-REQ-041` 체크리스트) — 보정 작업은 유니버스 종목만 받는다 |
| 게이트(후속) | 서버 `build` · `lint` · `test` 868 · `test:layer-check` · Swagger `failOnErrors`(경로 102 · `holidayName` 확인) / BFF `build` · `test` 298 / 웹 `check-types` · `lint` · `test` · `test:layer-check` · `web` · `web-tax` 빌드 — 번들 `/investments` 154 · 상세 137 kB, 바꾸기 직전 파일 사본 빌드와 같음(`FE-REQ-013`) / 훅 사후 실행 7파일 exit 0 |
| `kr_backtest` 대조 | `--as-of 2026-10-30` dry-run 을 공시 행 있음 · 뺌 두 번 — 리포트 493줄 **바이트 동일**(sha256 `71fee458…`) · 7,450,872행. 뺀 45행은 상시 서버 재시작으로 다시 채움(같은 45 · 휴장 3) |
| 서버 두 번째 인스턴스를 띄우지 않은 이유 | 워커 끄는 설정이 없다 — 가짜 시각으로 cron · KIS · DB 쓰기가 돈다 |

남은 미검증: 2027 휴장일(KRX 12월 공시 전 — 12-01 부터 서버 경고).
