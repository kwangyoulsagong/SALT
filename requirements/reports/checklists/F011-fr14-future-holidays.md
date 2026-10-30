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
| 평일 아침 실화면 "달력 추정" 사라짐 | 지금은 오후 — 다음 평일 09:10 전에 볼 수 있다(장 상태 계산은 위 표로 확인) | 2026-11-02 08:30~09:10 로그인 QA(`QA-001`) |
| 휴장 사유 이름 | 응답 · BFF · 화면 계약 변경 | §4-1 순위 2 F011 다음 줄 |
| 2027 휴장일(신정 외) | KRX 공시 전 | 2026-12 공시 뒤 · 12-01 부터 경고 로그 |
