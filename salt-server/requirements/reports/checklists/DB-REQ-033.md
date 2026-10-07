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
