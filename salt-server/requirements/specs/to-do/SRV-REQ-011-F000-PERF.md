---
id: SRV-REQ-011
feature: F000
area: srv
kind: PERF
title: "F000 정리·편집 — 서버 성능 정의 (정리 효과 측정 · 시장 개요 유지)"
priority: medium
labels: [performance, budget, cleanup-effect, worker]
created: 2026-09-09
---

## Summary

F000은 신규 계산이 없으므로 성능 요구가 가볍다. 이 REQ의 목적은 **정리의 효과를 측정하는 것**과 **변경 금지 목록(시장 개요)의 성능을 유지하는 것**이다.

## 예산

| 작업 | 예산 | 비고 |
|---|---|---|
| `POST /api/auth/invite/accept` | 500ms | 비밀번호 해싱 포함 |
| `GET /api/auth/invite/check` | 50ms | 유니크 인덱스 |
| `POST /api/auth/login` | 500ms | 해싱 |
| `GET /api/onboarding/status` | 150ms | ACL 2회 |
| `GET /api/investment/market/overview` (`limit=100`) | **300ms** | **변경 금지 — 현재 성능을 유지한다** |
| `GET /api/investment/watchlist` | 150ms | 현재가 포함 |
| `GET /api/investment/crypto/:symbol/chart?period=minute` | 200ms | 5분봉 30개 |
| `GET /api/news?symbol=&limit=5` | 100ms | |
| `GET /api/portfolio/summary` | 200ms | Projection |
| `GET /api/investment-notifications` | 100ms | |
| 410 응답 | 10ms | 핸들러만 |

## 변경 금지 목록의 성능을 유지한다

`market/overview`는 **완성도가 가장 높은 화면**의 데이터원이다. 이관 중 성능이 나빠지면 안 된다.

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 이관 전/후 `market/overview` p95를 측정해 **동일하거나 개선됨을 확인**한다 | Must |
| FR-2 | 응답 필드·정렬·필터가 **바이트 단위로 같아야 한다** (스냅샷 테스트) | Must |
| FR-3 | `limit=100`을 유지한다. 페이징으로 바꾸지 않는다 | Must |
| FR-4 | `MarketAsset` 인덱스(`isActive`·`tradeValue24h`·`change24h`·`currentPrice`·`priceUpdatedAt`)를 **그대로 둔다** | Must |
| FR-5 | Projection으로 조회한다. Aggregate 100개를 로드하지 않는다 | Must |

## 정리 효과 측정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **기동 워커 수**를 정리 전/후 측정한다. `market-price-updater` 제거로 1개 감소해야 한다 | Must |
| FR-11 | **상시 DB 커넥션 수**를 `pg_stat_activity`로 측정한다. 워커 1개 감소 효과를 기록한다 | Must |
| FR-12 | **`npm run build` 시간**을 정리 전/후 측정한다. 빌드 산출물 24개 제거 효과 | Must |
| FR-13 | 동면 route 제거로 **라우터 등록 수**가 줄어든 것을 기록한다 | Should |
| FR-14 | 측정값을 `requirements/reports/checklists/SRV-REQ-011.md`에 남긴다 | Must |

## 초대 코드 — 동시성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 같은 코드 동시 사용은 **조건부 UPDATE 또는 유니크**로 막는다. 애플리케이션 락을 쓰지 않는다 | Must |
| FR-21 | 계정 수 조회(`UserCountProbe`)가 `COUNT(*)`다. 사용자 ≤10명이므로 인덱스가 불필요하다 | Must |
| FR-22 | 비밀번호 해싱 비용을 확인한다. bcrypt cost가 높으면 500ms를 넘을 수 있다 | Must |
| FR-23 | `check` 엔드포인트에 **rate limit**을 둔다. 인증이 없어 무차별 대입이 가능하다 | Must |

## 뉴스와 알림

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 심볼별 뉴스 조회가 `NewsArticle @@index([symbols])`(GIN 배열)를 탄다. **`EXPLAIN`으로 확인**한다 | Must |
| FR-31 | 뉴스 목록에 `content`(전문)를 담지 않는다. **목록과 본문을 분리**한다 | Must |
| FR-32 | 알림 목록이 `@@index([userId, isRead])`를 탄다 | Must |
| FR-33 | `notification-cleanup.worker`가 **나눠 지운다**. 한 번에 `DELETE`하면 긴 트랜잭션 + 대량 죽은 튜플이 된다 | Must |

## 마이그레이션 영향

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | `AssetType` 확장이 모델 7종에 걸린다. **락 시간은 `DB-REQ-004`가 측정**한다 | Must |
| FR-41 | 마이그레이션 중 워커를 멈추고 재기동 순서를 문서화한다 | Must |
| FR-42 | 마이그레이션 후 `ANALYZE`를 실행한다 | Must |

## 관측성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 측정: 엔드포인트별 p95, **410 호출 수(1주)**, 초대 시도·실패 수, 워커 수, 상시 커넥션 수, 빌드 시간 | Must |
| FR-51 | **410 로그를 1주 수집**하고 잔여 호출이 0건인지 확인한다. 0이 아니면 프론트를 고친다 | Must |
| FR-52 | 성능 수정 커밋에 before/after 수치를 남긴다 | Must |

## Acceptance Criteria

- [ ] `market/overview` p95가 이관 전/후 동일하거나 개선되었다 (측정값 기록)
- [ ] `market/overview` 응답이 이관 전/후 바이트 단위로 같다 (스냅샷 테스트)
- [ ] `limit=100`이 유지된다
- [ ] `MarketAsset` 인덱스 5개가 그대로 있다
- [ ] `market/overview`가 Projection으로 조회된다 (Aggregate 로드 0건)
- [ ] **기동 워커 수가 정리 전/후 기록되고 1개 감소했다**
- [ ] **상시 DB 커넥션 수가 기록되어 있다**
- [ ] `npm run build` 시간이 정리 전/후 기록되어 있다
- [ ] 측정값이 checklist 리포트에 있다
- [ ] 같은 초대 코드 동시 사용에서 하나만 성공한다 (동시 요청 테스트)
- [ ] 애플리케이션 락이 0건이다
- [ ] `invite/accept`·`login` p95 < 500ms (측정값 기록)
- [ ] `invite/check`에 rate limit이 있다
- [ ] 심볼별 뉴스 조회의 `EXPLAIN`에 `Seq Scan`이 0건이다
- [ ] 뉴스 목록 응답에 `content`가 0건이다
- [ ] 알림 목록이 인덱스를 탄다
- [ ] `notification-cleanup.worker`가 배치로 지운다
- [ ] 마이그레이션 중 워커 중단·재기동 순서가 문서화되어 있다
- [ ] 마이그레이션 후 `ANALYZE`가 실행되었다
- [ ] **410 로그 1주 수집 결과 잔여 호출이 0건이다**

## Dependencies

- **선행:** `SRV-REQ-008`~`010` · `DB-REQ-004`(F000 DB 성능)
- **규칙:** `performance-server.md` · `performance-database.md`

## Open Questions

- bcrypt cost 값. 사용자 ≤10명이면 높게 잡아도 부담이 없지만 500ms 예산을 넘지 않아야 한다.
- `invite/check` rate limit 기준(IP당 분당 N회). 사용자 ≤10명이면 매우 낮게 잡아도 된다.
- `NewsArticle.symbols` 배열 인덱스가 실제로 GIN인지 확인 필요. Prisma의 `@@index([symbols])`가 배열에 어떤 인덱스를 만드는지 실측해야 한다.
