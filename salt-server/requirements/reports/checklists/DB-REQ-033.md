# DB-REQ-033 F011 국내 주식 스키마 — 체크리스트 (2026-10-07)

| 확인 | 결과 |
|---|---|
| 마이그레이션 | `20261007140000_kr_stock_foundation` 로컬 `migrate deploy` · `prisma generate` · 추가만(`ALTER TYPE … ADD VALUE IF NOT EXISTS` · `CREATE TABLE` 4 · `CREATE INDEX` 1 · FK 1). diff 가 함께 낸 기존 인덱스 RenameIndex 2줄은 무관해 뺐다 |
| 정밀도 | 금액 `(38,10)` · 비율 `(18,8)` — 처음 `(65,30)` 으로 만들었다가 커밋 전 로컬에서 표를 내리고 다시 만들었다(토큰 행 백업 · 복원, 재발급 없음) |
| 원장 보존 | `price_history` crypto 1,087,410 · `portfolio_transactions` 2 · `portfolio_holdings` 2 — 국내 주식 행만 추가 |
| 시각 | 원시 SQL 쓰기 전부 `timestamptz AT TIME ZONE 'UTC'` — 첫 판 9시간 어긋난 로컬 행(일봉 · 시세 · 동기화 시각)을 바로잡음, 일봉 24,300 전부 `15:00Z` |
| 실행 계획 | 시총 상위 `Index Scan Backward` 0.4ms · 시세 표 2.6ms · 검색 2~20ms |
| FK | 마스터에 없는 코드는 현재가 upsert 에서 걸러진다(`WHERE EXISTS`) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 운영 DB 적용 · `ALTER TYPE` 락 시간 | 운영 미접근. `ADD VALUE` 는 테이블 재작성이 없다(PG 12+) | 배포 시 |
| 토큰 평문 저장 | Open Question(소유자 1인 운영) | 사용자 결정 |
| `price_history` 국내 주식 5분봉 보관 | 기존 정리 작업이 5분봉 30일 · 일봉 2년을 자산군 구분 없이 지운다 — 국내 주식도 같다(의도와 일치) | — |

## 2026-10-08 추가 — OHLC 열

| 항목 | 결과 |
|---|---|
| 마이그레이션 `20261008100000_kr_stock_quote_ohlc` | 로컬 `prisma migrate deploy` 적용 · 클라이언트 재생성 · 기존 행 null(다음 1분 조회 · 체결이 채움, 실측 채워짐) |
| 롤백 | `ALTER TABLE kr_stock_quotes DROP COLUMN open_price, DROP COLUMN high_price, DROP COLUMN low_price` — 미실행 |
| 운영 적용 | 미검증 — 배포 시 |

## 추가 — 로고 출처 컬럼(2026-10-08)

| 항목 | 결과 |
|---|---|
| 마이그레이션 `20261008120000_kr_stock_logo_source` | 로컬 `migrate deploy` 적용 · `prisma generate` · `migrate status` up to date |
| 기존 행 | nullable 추가만 — 영향 0. 판정 뒤 50행에 `logo_source`(ticker 43 · none 7) |
| 롤백 | `DROP COLUMN` 넷 |

## 2026-10-23 — 정리매매 컬럼(F011 5e)

- `ALTER TABLE kr_stock_master ADD COLUMN is_liquidation BOOLEAN NOT NULL DEFAULT false` — 추가만, 기존 4,408행 false 로 채워짐 · 롤백 = DROP COLUMN
- `prisma migrate deploy` 로컬 성공 · 동기화 뒤 3행 true


## 슬라이스 5f (2026-10-23)

- 스키마 변경 없음 · 마이그레이션 없음. 새 쿼리 실행계획 · 원장 보존: 교체는 그 종목 국내 일봉만(재작성 10종목 · 1,232봉씩 다시 받음, 행 수는 받은 이력과 같다). 세부는 `SRV-REQ-040` 체크리스트 §5f
- 미검증 · 범위 밖: 없음

## F011 슬라이스 7d — 단면 읽기 쿼리 (2026-10-26)

- DDL 없음. `EXPLAIN (ANALYZE, BUFFERS)` 581ms — 병렬 순차 스캔 204ms(행 31.8만) + 정렬 디스크 3MB × 3. 인덱스 추가 안 함(사유 Changelog)

## 슬라이스 6 — FR-7 `kr_index_quotes` · FR-8 `kr_stock_investor_flows` (2026-10-26)

| 항목 | 결과 |
|---|---|
| 마이그레이션 `20261026180000_kr_index_investor_flows` | 새 표 2개 · FK 1(master cascade) · 기존 표 무변경. `prisma migrate diff` 에 섞여 나온 기존 인덱스 이름 차이 2건(코치 스냅샷)은 이 목적과 무관해 넣지 않았다 — 마이그레이션 1개 = 목적 1개 |
| 로컬 적용 · generate | `migrate deploy` 통과 · `prisma:generate` |
| 쓰기 | 종목마다 `unnest` 한 문장 upsert(1,450행 39초 중 대부분은 KIS 대기) · 시각 `timestamptz AT TIME ZONE 'UTC'` · 거래일 `date` |
| 읽기 | 투자자: PK `(code, trade_date)` 접두 + `ORDER BY trade_date DESC LIMIT n` — 별도 인덱스 없음. 지수: 2~3행 PK |
| 롤백 | 마이그레이션 머리 `DROP TABLE` 두 줄 · 원장 3종 무관 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `EXPLAIN (ANALYZE, BUFFERS)` | 행 1,450 이라 계획이 의미 없다 — PK 를 탄다는 것만 구조로 확인 | 1년 쌓인 뒤(약 12,500행) 상세 요청이 느리다는 관찰이 있을 때 |

## 슬라이스 6b — FR-9 시간외 칸 (2026-10-27)

| 항목 | 결과 |
|---|---|
| 마이그레이션 `20261027120000_kr_stock_after_hours` | 로컬 적용(`prisma migrate deploy`) · nullable 칸 5개 추가만 · 롤백 SQL 머리 |
| 쓰기 | `PrismaKrSupplementStore.upsertAfterHours` — `unnest` 한 문장 `UPDATE … FROM`, 정규장 칸 무변경 |
| 읽기 | 기존 시세 조회 행에서 함께 — 쿼리 수 무변경 |
| 인덱스 | 없음 — PK 행 단위 갱신 |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실회차 쓰기 | 16:11 전 | 2026-10-27 16:11 뒤 `after_hours_at` 이 찍힌 행 수 |

## 2026-10-30 — F000 종목 검색 · 추적 자산 상한 (파일만 걸침)

- 파일만 걸침 — `market/domain/ports.ts` 에 `WatchlistRepository.listAll` · `HoldingProbe` · 행 `isHeld?`. 스키마 · 마이그레이션 없음(`@@index([userId, assetType])` 로 충분)
- 확인: prisma generate · build pass

미검증: 없음 — 판단 무변경

## 2026-10-30 — F004 슬라이스 19 차트 1주 탭

- 파일만 걸침 — 서버 `market/domain/ports.ts` 에 `ExchangeQuotePort.weeklyCandles`(Upbit 조회만). 스키마 · 쿼리 무변경
- 미검증 · 범위 밖: 없음
