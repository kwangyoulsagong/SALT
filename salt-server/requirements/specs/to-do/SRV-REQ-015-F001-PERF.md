---
id: SRV-REQ-015
feature: F001
area: srv
kind: PERF
title: "F001 개입 청구서 — 서버 성능 정의"
priority: critical
labels: [performance, budget, snapshot, transaction, batch]
created: 2026-09-09
---

## Summary

반사실 계산은 **원장 전체를 훑고 LLM을 부른다.** 두 병목이 한 유스케이스에 있다. 이 REQ가 예산과 그것을 지키는 구조를 정의한다.

## 예산

| 작업 | 예산 | 초과 시 |
|---|---|---|
| `GET /api/invoice` (스냅샷 히트) | **300ms** | 스냅샷 조회 인덱스 점검 |
| `GET /api/invoice` (스냅샷 미스) | **300ms** (즉시 `degraded` 반환) | FR-10 위반 |
| 반사실 전체 계산 (백그라운드) | **1.5s (p95)** | 거래 5,000건 · 일봉 3,000개 기준 |
| `GET /api/invoice/trades` | 200ms | 인덱스 점검 |
| `GET /api/ledger/health` | 300ms | Projection |
| `POST /api/ledger/import` 10,000행 | **10s** | 배치 크기 조정 |
| `POST /api/ledger/backfill` 3,000개 | 5s | 배치 insert |
| 홀딩 재계산 | 300ms | 집계 쿼리 1회 |
| LLM narrative 생성 | 6s · **비동기** | 동기로 만들지 않는다 |
| `GET /api/fx/rate` | 50ms | 유니크 인덱스 |

## 구조 1 — 스냅샷이 예산을 지키는 유일한 방법

계산이 1.5s이고 화면 첫 페인트 예산이 300ms다. **매 요청마다 계산하면 못 지킨다.**

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | 응답은 **스냅샷 기반**이다. 현재가만 실시간 보정한다 | Must |
| FR-2 | 스냅샷 조회는 `(userId, window, computedAt DESC) LIMIT 1`. **50ms 이내** | Must |
| FR-3 | 스냅샷은 월요일 09:00 KST 워커가 전 window에 대해 만든다 | Must |
| FR-4 | `series`는 표시 해상도로 **다운샘플링**해서 저장한다 | Must |
| FR-5 | `narrativeJson`은 **스냅샷 생성 시 1회** 만든다. 매 요청마다 LLM을 부르지 않는다 | Must |

## 구조 2 — 스냅샷 미스를 요청이 기다리지 않는다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 스냅샷이 없으면 **비동기 계산을 띄우고 즉시 응답**한다. `degraded: true` + `degradedReasons: ['snapshot_missing']` + 마지막 스냅샷(있으면) | Must |
| FR-11 | 같은 사용자의 계산이 이미 돌고 있으면 **새로 띄우지 않는다**(advisory lock) | Must |
| FR-12 | 계산 완료를 프론트가 어떻게 아는지 정한다: 폴링 또는 알림 → `BFF-REQ-014`에서 확정 | Must |

## 구조 3 — 트랜잭션 경계

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | **CSV 파싱을 트랜잭션 밖**에서 한다. 10,000행 파싱이 커넥션을 잡으면 안 된다 | Must |
| FR-21 | **LLM 호출을 트랜잭션 밖**에서 한다. 수 초~수십 초가 커넥션과 락을 잡으면 서버가 멈춘다 | Must |
| FR-22 | **거래소·환율 API 호출을 트랜잭션 밖**에서 한다 | Must |
| FR-23 | 패턴: 짧은 읽기 트랜잭션 → 외부 호출·계산(트랜잭션 없음) → 짧은 쓰기 트랜잭션 | Must |
| FR-24 | `prisma.$transaction`은 `application`에서만 호출한다 | Must |

## 구조 4 — 배치

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | import는 `createMany` **1,000건 단위 배치**. 단건 insert 10,000번은 왕복 10,000번이다 | Must |
| FR-31 | 중복 판정을 애플리케이션 루프로 하지 않는다. `skipDuplicates` 또는 유니크 위반 처리로 DB에 맡긴다 | Must |
| FR-32 | 일봉 백필도 배치 insert | Must |
| FR-33 | 홀딩 재계산은 **심볼별 집계 쿼리 1회**다. 거래를 전부 읽어 루프로 합산하지 않는다 | Must |

## 구조 5 — Projection

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 수수료 합계 · 편향별 집계 · 최대 손익 3건 · 홀딩 요약을 **Projection**으로 조회한다. Aggregate를 로드하지 않는다 | Must |
| FR-41 | 청구서 화면 1회 렌더의 **쿼리 수가 20개 이하**다. `log: ['query']`로 확인 | Must |

## 구조 6 — 워커 격리

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | **`counterfactual.worker`(LLM 포함)와 DB만 훑는 워커를 같은 큐에 넣지 않는다.** 우리 워커는 단일 워커 성향이므로, LLM이 수십 초를 잡으면 뒤의 작업이 아무 일도 못 하고 기다린다 | Must |
| FR-51 | 워커 동시 실행 수를 **1~2로 제한**한다. 사용자 ≤10명이지만 window 5개 × 사용자 10명 = 50개 계산이 몰릴 수 있다 | Must |
| FR-52 | 큐가 차면 거부하고 다음 주기로 넘긴다. **무한 큐는 메모리를 먹으면서 아무도 모르게 밀린다** | Must |
| FR-53 | 워커가 마이그레이션 중에 중단되고 재기동되는 순서를 문서화한다 | Should |

## 관측성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 측정 항목: import 건수/중복/실패, **반사실 계산 시간 분포**, **`reconciliation` 잔차 히스토그램**, 원장 대조 오차율, 일봉 결측률, LLM 성공률·지연, 스냅샷 생성 성공/실패 | Must |
| FR-61 | **잔차 히스토그램이 가장 중요한 지표다.** 잔차가 커지는 추세는 원장 오염 신호다 | Must |
| FR-62 | 슬로우 쿼리 로그 임계값을 예산에 맞춘다 | Must |
| FR-63 | 성능 수정 커밋에 **before/after 수치**를 남긴다 | Must |

## Acceptance Criteria

- [ ] `GET /api/invoice` 스냅샷 히트 p95 < 300ms (측정값 기록)
- [ ] 스냅샷 미스에서도 응답이 300ms 이내이고 `degraded: true`다
- [ ] 거래 5,000건 시딩 후 반사실 전체 계산 p95 < 1.5s (측정값 기록)
- [ ] 스냅샷 조회 < 50ms
- [ ] `series` 길이가 다운샘플링 상한 이하다
- [ ] LLM narrative가 스냅샷당 1회만 생성된다 (호출 카운터로 확인)
- [ ] 같은 사용자 계산이 동시에 두 번 돌지 않는다
- [ ] CSV 파싱·LLM·외부 API 호출이 트랜잭션 밖이다 (코드 검사)
- [ ] `prisma.$transaction`이 `application` 밖에 0건이다
- [ ] import 10,000행 < 10s이고 단건 insert가 0건이다
- [ ] 중복 판정이 애플리케이션 루프가 아니다
- [ ] 홀딩 재계산이 집계 쿼리 1회다
- [ ] Projection 4개가 쓰이고 Aggregate 로드가 0건이다
- [ ] 청구서 렌더 쿼리 수 ≤ 20
- [ ] LLM 워커와 DB 워커가 다른 큐에 있다
- [ ] 워커 동시 실행이 1~2로 제한되고 큐가 차면 거부한다
- [ ] 관측 항목 7종이 로그·메트릭에 있다
- [ ] **잔차 히스토그램이 존재한다**

## Dependencies

- **선행:** `SRV-REQ-012`~`014` · `DB-REQ-008`(DB 성능)
- **규칙:** `performance-server.md` · `performance-database.md`

## Open Questions

- 거래 5,000건 / 일봉 3,000개가 실제 규모와 맞는가. 사용자 ≤10명이면 훨씬 작을 수 있고, **그러면 스냅샷 없이도 예산을 지킬 수 있어 FR-1~12의 복잡도를 줄일 수 있다.** 실측 후 재검토 — 이 판단이 F001의 구현 규모를 가장 크게 바꾼다.
- LLM narrative를 스냅샷 생성과 분리할지. 분리하면 스냅샷이 빨라지고 narrative는 나중에 채워진다.
- 스냅샷 완료를 프론트에 알리는 방식(폴링 vs 알림 vs SSE).
