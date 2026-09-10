---
id: BFF-REQ-010
feature: F000
area: bff
kind: PERF
title: "F000 정리·편집 — BFF 성능 정의 (변경 금지 목록 유지 · 정리 효과)"
priority: medium
labels: [bff, performance, budget, websocket, cache]
created: 2026-09-09
---

## Summary

F000의 성능 요구는 **① 변경 금지 목록(실시간 테이블·시세 WS)의 성능을 유지하고 ② 정리 효과를 측정하는 것** 둘이다.

## 예산

| 엔드포인트 | 예산 | 비고 |
|---|---|---|
| `GET /api/app/market/overview` (`limit=100`) | **350ms** | **변경 금지 — 현재 성능 유지** |
| `GET /api/app/watchlist` | 200ms | 현재가 보정 포함 |
| `GET /api/app/news?limit=5` | 150ms | |
| `GET /api/app/portfolio/summary` | 250ms | |
| `GET /api/app/alerts` | 150ms | |
| `GET /api/app/onboarding/status` | 200ms | |
| `POST /api/app/onboarding/invite` | 2.2s | 서버 해싱 |
| 차트 프록시 | 250ms | 5분봉 30개 |
| `market-intelligence` 프록시 | 350ms | |
| 410 응답 | **5ms** | 핸들러만 |
| **BFF가 얹는 지연** | **20ms 이하** | |

## 변경 금지 목록의 성능을 유지한다

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | `market/overview` p95를 정리 전/후 측정해 **동일하거나 개선됨**을 확인한다 | Must |
| FR-2 | 응답이 **바이트 단위로 같아야 한다** (스냅샷 테스트) | Must |
| FR-3 | `limit=100`을 유지한다. 페이징으로 바꾸지 않는다 | Must |
| FR-4 | 가격 캐시(`market-overview.service`)의 갱신 주기와 히트율을 측정한다 | Must |
| FR-5 | `market-intelligence` 프록시 성능을 유지한다. 게이지가 이것을 쓴다 | Must |

## WebSocket — 구독 정책 유지

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | 시세 WS 구독 정책(`limit=100`)을 **바꾸지 않는다** | Must |
| FR-11 | 가격 갱신을 **throttle해서 내려보낸다.** 초당 수십 회를 그대로 밀면 프론트가 리렌더로 죽는다 | Must |
| FR-12 | 클라이언트 연결이 끊기면 상위 구독을 정리한다. **유령 구독 0건** | Must |
| FR-13 | worker는 **직접 실행될 때만** 시작한다. import side effect로 interval·socket이 중복 생성되지 않게 한다 | Must |
| FR-14 | **서버 `market-price-updater` 제거로 BFF `price-updater.worker`가 단일 경로**가 된다. 갱신이 끊기지 않는지 확인한다 | Must |
| FR-15 | 동시 WS 연결 수와 구독 심볼 수를 측정한다 | Must |

## 정리 효과 측정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | **라우트 등록 수**를 정리 전/후 측정한다 | Should |
| FR-21 | **410 호출 수를 1주 수집**한다. 잔여 호출이 0건이어야 한다 | Must |
| FR-22 | `npm run build` 시간을 정리 전/후 기록한다 | Should |
| FR-23 | 측정값을 `requirements/reports/checklists/BFF-REQ-010.md`에 남긴다 | Must |

## 현재가 보정

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 보정은 **인메모리 캐시 읽기**다. 20ms 이내 | Must |
| FR-31 | 캐시 미스 시 **서버를 다시 부르지 않는다** | Must |
| FR-32 | 보정 로직이 O(항목 수)다. 중첩 루프 0건 | Must |

## 캐시

| 대상 | 정책 |
|---|---|
| 시장 개요 가격 | 기존 인메모리 캐시 (worker 갱신) — **유지** |
| 뉴스 | 캐시하지 않는다. 서버가 크롤링 주기를 갖는다 |
| 관심 종목 | 캐시하지 않는다 |
| 온보딩 상태 | 캐시하지 않는다 |
| 알림 | 캐시하지 않는다 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 새 캐시를 만들지 않는다. **서버 캐시를 먼저 확인**한다 | Must |
| FR-41 | 두 곳에 캐시를 두면 무효화가 두 배로 어려워진다 | Must |

## 병렬화와 타임아웃

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | 홈 조립을 `Promise.allSettled`로 병렬화한다. `await` 연쇄 0건 | Must |
| FR-51 | 서버 호출마다 타임아웃 | Must |
| FR-52 | mutation 재시도 0회 | Must |
| FR-53 | `invite/check`에 **rate limit**을 둔다. 인증이 없어 무차별 대입이 가능하다 | Must |

## 관측성

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | 측정: 엔드포인트별 p95, **410 호출 수(1주)**, 가격 캐시 히트율, WS 연결·구독 수, throttle 후 전송률, `priceStale` 발생률 | Must |
| FR-61 | **BFF가 얹는 지연**을 별도 측정한다 | Must |
| FR-62 | 초대 요청 본문(비밀번호)을 **로깅하지 않는다** | Must |
| FR-63 | 성능 수정 커밋에 before/after 수치를 남긴다 | Must |

## Acceptance Criteria

- [ ] `market/overview` p95가 정리 전/후 동일하거나 개선되었다 (측정값 기록)
- [ ] `market/overview` 응답이 바이트 단위로 같다 (스냅샷 테스트)
- [ ] `limit=100`이 유지된다
- [ ] 가격 캐시 히트율이 측정되어 있다
- [ ] `market-intelligence` 프록시 성능이 유지된다
- [ ] WS 구독 정책이 바뀌지 않았다
- [ ] 가격 갱신이 throttle되어 내려간다 (전송률 측정)
- [ ] 클라이언트 연결 종료 시 상위 구독이 정리된다 (유령 구독 0건)
- [ ] worker가 import side effect로 중복 생성되지 않는다
- [ ] **서버 worker 제거 후에도 `MarketAsset` 갱신이 끊기지 않는다**
- [ ] 동시 WS 연결·구독 심볼 수가 측정되어 있다
- [ ] **410 호출 수 1주 수집 결과 잔여 호출이 0건이다**
- [ ] 측정값이 checklist 리포트에 있다
- [ ] 현재가 보정이 20ms 이내이고 캐시 미스 시 서버를 부르지 않는다
- [ ] 새 캐시가 0건이다
- [ ] 홈 조립이 병렬이고 `await` 연쇄가 0건이다
- [ ] mutation 재시도가 0건이다
- [ ] `invite/check`에 rate limit이 있다
- [ ] **BFF가 얹는 지연 < 20ms** (측정값 기록)
- [ ] 로그에 비밀번호가 0건이다

## Dependencies

- **선행:** `BFF-REQ-007`~`009` · `SRV-REQ-011`(서버 성능)
- **규칙:** `performance-bff.md` · `websocket-worker.md`

## Open Questions

- 가격 갱신 throttle 주기. 현재 값을 확인하고 60fps 이상 필요하지 않다는 원칙에 맞는지 본다.
- `invite/check` rate limit 기준(IP당 분당 N회).
- WS 구독을 "화면이 보는 종목만"으로 좁힐지. 현재 `limit=100`을 전부 구독하는지 확인 필요 — **좁히면 성능이 개선되지만 변경 금지 목록에 걸릴 수 있다.**
