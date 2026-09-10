---
globs: salt-server/prisma/**, salt-server/src/*/infrastructure/**
---

# DB 성능 규칙 (PostgreSQL + Prisma)

## 0. 이 DB의 조건

- 사용자 ≤10명 → 커넥션 풀은 작게. 크게 잡으면 메모리만 먹는다
- 그런데 **워커 6개 이상이 상시 돌고 LLM·반사실 작업이 커넥션을 오래 잡는다** → 풀이 작아서 더 위험하다
- **원장 데이터에 백업이 없다** → 파괴적 작업에 특히 보수적으로

## 1. 금액과 정밀도 — 이 DB의 1번 규칙

| 항목 | 타입 |
|---|---|
| 금액 | `Decimal @db.Decimal(38, 10)` |
| 수량 | `Decimal @db.Decimal(38, 18)` |
| 비율·환율 | `Decimal @db.Decimal(18, 8)` |

- **신규 금액 컬럼에 `Float`를 쓰지 않는다.** 청구서 항등식 허용치가 100원이고 `Float` 누적 오차로는 못 맞춘다
- 기존 `Float` 원장 컬럼(`PortfolioTransaction.price/quantity/fee`, `PortfolioHolding.*`)은 별도 마이그레이션 대상이다. 그때까지 **매퍼에서 `Decimal`로 승격**한다(`ddd-infrastructure.md` §2)
- **원 단위 반올림은 응답 직전 1회만.** DB에는 반올림하지 않은 값을 저장한다

## 2. 인덱스

### 조회 패턴에서 출발한다

테이블을 만들 때가 아니라 **쿼리를 쓸 때** 인덱스를 정한다. "일단 PK에 걸고 나중에"는 나중이 오지 않는다.

```sql
-- 조회: 사용자별 편향 손익 정렬
SELECT * FROM trade_attributions WHERE user_id = ? ORDER BY attributed_pnl ASC;
-- 인덱스: 등호 컬럼 먼저, 정렬 컬럼 마지막
CREATE INDEX ix_attr_user_pnl ON trade_attributions (user_id, attributed_pnl);
```

### 복합 인덱스 컬럼 순서

```
등호 조건(=) → 범위 조건(<, >, BETWEEN) → 정렬(ORDER BY)
```

순서를 틀리면 인덱스를 타다가 중간에 멈춘다.

### 우리 시계열 패턴

`PriceHistory`·`TechnicalIndicator`가 이미 `(symbol, timeframe, timestamp)`를 쓴다. 신규 시계열도 같은 축을 따른다: `IndicatorSnapshot(indicator, asOf)` · `FxRate(base, quote, rateDate, kind)`.

### 부분 인덱스를 적극적으로 쓴다

```sql
-- 미실행 계획만 조회한다
CREATE INDEX ix_plan_pending ON weekly_plan_executions (user_id, week_of)
  WHERE status = 'planned';

-- 만료되지 않은 알림만 화면에 나온다
CREATE INDEX ix_notif_active ON "InvestmentNotification" (user_id, created_at DESC)
  WHERE is_read = false;
```

### UNIQUE에 nullable 컬럼을 넣으면 그 자리가 안 막힌다

PostgreSQL에서 **NULL은 서로 다른 값**이다. `UNIQUE (user_id, source, source_ref)`에서 `source_ref`가 NULL인 행은 몇 번이든 들어간다.

**우리에게 이건 양날이다.**

- **이득:** 기존 원장 row에 `source_ref = null`을 넣어도 제약 위반이 없다 → 데이터를 건드리지 않고 유니크를 추가할 수 있다
- **위험:** import 파서가 `source_ref`를 못 만들면 **중복 방지가 아무것도 막지 않는다.** 같은 CSV를 두 번 올려도 통과한다

→ **`sourceRef`가 없는 import를 허용하지 않는다.** 거래소가 주문 UUID를 주지 않으면 `(체결시각+심볼+수량+단가)` 해시를 쓴다. **CSV 행 번호를 섞지 않는다** — 섞으면 재업로드 시 값이 달라져 중복 방지가 깨진다.

### 만들지 말아야 할 인덱스

- 쓰기가 잦고 읽기가 드문 컬럼
- 카디널리티가 낮은 단일 컬럼(불리언, 3종 enum) — 복합 인덱스의 **선행 컬럼**으로는 유효하다
- 이미 있는 복합 인덱스의 **접두사와 같은** 인덱스 — `(a, b)`가 있으면 `(a)`는 불필요

## 3. 실행 계획 확인 의무

**새 쿼리나 인덱스를 추가하면 `EXPLAIN (ANALYZE, BUFFERS)`를 돌리고 결과를 PR에 붙인다.**

| 신호 | 의미 |
|---|---|
| `Seq Scan` on 큰 테이블 | 인덱스 없음 또는 안 탐 |
| `rows=1000` vs `actual rows=200000` | 통계가 틀렸다 → `ANALYZE` |
| `Sort` + `external merge Disk` | 정렬 인덱스 없음 |

인덱스를 만들었는데 안 타면 **컬럼 순서**나 **타입 불일치**를 본다.

## 4. JSON 사용 기준

현재 코드가 `InvestmentInsight.payload` JSON을 **조건으로 뒤진다**(`signal-performance.service`가 100건을 읽어와 `payload.kind`로 필터). 인덱스를 못 쓴다.

- **써도 되는 경우:** 구조가 행마다 다르고 **쿼리 조건으로 쓰지 않을 때**. 허용 목록: `seriesJson` · `bandConfigJson` · `hitsJson` · `missesJson` · `scopesJson` · `cipherMeta`
- **쓰면 안 되는 경우:** 조회·정렬·집계 조건이 되는 값 → **별도 컬럼으로 승격한다**
- 신규 코드에서 `payload` JSON 조건 쿼리를 추가하지 않는다

## 5. 락과 트랜잭션

- **긴 트랜잭션이 이 DB에서 가장 흔한 사고 원인이다.** 외부 호출을 트랜잭션 밖으로(`performance-server.md` §2)
- 격리 수준은 기본(Read Committed)을 유지한다. 불변식이 필요하면 **격리 수준이 아니라 제약(UNIQUE·CHECK)으로** 해결한다
- 같은 사용자의 반사실 계산 중복 실행은 **advisory lock**으로 막는다:

```sql
SELECT pg_try_advisory_xact_lock(hashtext('counterfactual:' || :userId));
```

`_xact_` 변형을 쓴다 — 트랜잭션이 끝나면 자동 해제되므로 해제를 잊는 사고가 없다.

## 6. DDL과 마이그레이션

- **`ALTER TYPE`은 락이 세다.** `AssetType` 확장이 모델 7종에 걸리고 `PriceHistory`는 누적 테이블이다. 락 시간을 측정하고 10초를 넘으면 컬럼 교체 방식으로 전환한다(`DB-REQ-003`)
- `CREATE INDEX CONCURRENTLY`는 쓰기를 막지 않지만 **트랜잭션 안에서 못 쓴다**
- **컬럼 삭제·이름 변경은 2단계로** — 새 컬럼 추가 + 병행 쓰기 → 다음 릴리스에서 제거
- **drop 전에 `pg_dump -Fc` 스냅샷 + 복원 테스트 1회.** 경로를 커밋 메시지에 남긴다
- 마이그레이션 1개 = 목적 1개. drop과 add를 섞지 않는다

## 7. MVCC · VACUUM

- 잦은 UPDATE 테이블을 주의한다: `PortfolioHolding`(가격 갱신마다) · `MarketAsset`(시세 워커) · `WeeklyPlanExecution`
- autovacuum을 끄지 않는다. 갱신이 잦은 테이블은 임계값을 낮춘다
- 죽은 튜플이 쌓이면 인덱스도 비대해진다 — "인덱스가 있는데 느리다"의 흔한 원인이다
- `VACUUM FULL`은 `ACCESS EXCLUSIVE` 락을 잡는다. 워커가 도는 중에 돌리지 않는다

## 8. 대량 작업

- CSV import 10,000행은 **`createMany` 배치**로. 단건 insert 10,000번은 왕복 10,000번이다
- 일봉 백필도 배치로
- 알림 정리(`notification-cleanup.worker`)는 **나눠 지운다.** 한 번에 `DELETE`하면 긴 트랜잭션 + 대량 죽은 튜플이 된다
- 정리 작업을 워커 시작 직후에 몰아 돌리지 않는다

## 9. 보존

- **원장 3종(`PortfolioTransaction` · `PortfolioHolding` · `PriceHistory`)은 어떤 마이그레이션에서도 row 손실이 없어야 한다.** 전후 `count(*)` 비교가 수용 기준
- `YearEndPriceSnapshot`은 **수정·삭제 불가**다. 변경 시도는 애플리케이션에서 거부하고 감사 로그를 남긴다
- 거래소 키는 **암호문만** 저장한다. 평문 컬럼을 만들지 않는다
