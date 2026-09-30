---
id: SLICE-F010-6-INDEPENDENT-DATA
title: "F010 슬라이스 6 (1차) — Deribit DVOL(dvol-sigma@1 채택 없음) · 업비트 거래 유의/주의 스냅샷 · 투자유의 종목 판정 · 추천 미발행"
priority: high
labels: [F010, slice, forecast, db, server, bff, fe]
created: 2026-09-30
---

## Summary

리서치 §10 슬라이스 6(독립 데이터) 중 **공개 API 2종**만(사용자 결정 2026-09-30). 업비트 공지 JSON 은 2026-09-23 결정대로 쓰지 않는다.
Coin Metrics · 도미넌스 · 데이터랩 · 뉴스 구조화 · LLM 가드는 다음 묶음.

| 결과 | 제품에 들어간 것 |
|---|---|
| `dvol-sigma@1` — blend 가 7일 실현 분산 예측에서 EWMA 를 이김(BTC −0.085 · ETH −0.074, 98.75% 상한 < 0, 반기 둘 다) · **목표 비중 Calmar 0.29 → 0.26** | **채택 없음** → 목표 비중 σ 는 EWMA 그대로. DVOL 은 매일 수집만 |
| 업비트 `market_event` — 이력 없는 원천 | 매일 불변 스냅샷 · `market-warning@1` 라이브 통계 등록(첫 확인 2026-11-25) |
| 투자유의 정책(리서치 §11) | 종목 판정 `exchange_warning` 으로 막힘 · 코치 추천 후보에서 제외 · 주의만이면 판정 아래 사실 한 줄 |

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| 예측 | `salt-forecast/requirements/specs/in-progress/FC-REQ-014-F010-INDEPENDENT-DATA.md`(신규) FR-1~7 | 사전등록 2 · 수집 2 · DVOL 채점 · 리포트 |
| DB | `salt-server/requirements/specs/in-progress/DB-REQ-029-F008-SCHEMA.md` FR-22 | `market_warning_snapshot`(불변) · `v_market_warning` |
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-024-F004-FUNC.md` FR-191~193 | 게이트 첫 검사 · `exchangeFlag` · 추천 후보 제외 |
| BFF | `bff/requirements/specs/in-progress/BFF-REQ-039-F010-JUDGMENT-SCREEN.md` FR-6 | 막힘 사유 · 표시 뷰모델 · 막는 쪽으로만 보정 |
| 프론트 | `salt-microFe/requirements/specs/in-progress/FE-REQ-040-F010-JUDGMENT-SCREEN.md` FR-14 | 막힘 안내 둘째 줄 · 주의 한 줄(패널 · 상세) |

## 커밋 (되돌리기 지점)

| 커밋 | 무엇 | 되돌리려면 |
|---|---|---|
| `f368464` docs(forecast) | 사전등록 `dvol-sigma@1` · `market-warning@1` — **결과 · 첫 수집 전** | 되돌리지 않는다(증거) |
| `1b515c5` refactor(forecast) | main 에서 깨진 `lint-imports` '층' 계약 복구(행 타입을 domain 으로) — 동작 변경 없음 | 이 커밋 |
| `237fc28` feat(forecast) | DVOL · 거래소 표시 수집 + 마이그레이션 | 서버 · BFF · FE 커밋 뒤에. 뷰 → 표 DROP |
| `b751e05` feat(forecast) | `dvol-sigma@1` 실행 코드 — 결과 전 | 이 커밋 |
| `0b24f6c` docs(forecast) | 리포트(채택 없음) | 되돌리지 않는다(증거) |
| `e96e5b0` feat(server) | 투자유의 게이트 · `exchangeFlag` · 추천 후보 제외 | BFF · FE 와 함께(새 막힘 사유) |
| `1eb7859` feat(bff) | 막힘 사유 · 표시 뷰모델 | FE 와 함께 |
| `a2df507` feat(fe) | 막힘 안내 · 주의 한 줄 | 이 커밋 |
| `a7f7923` fix(fe) | 새 두 줄 대비 AA · keep-all | 이 커밋 |
| `c21d49a` fix(fe) | **앱 전체 보조 회색 한 단계 진하게**(tertiary · 앱 `text.primary` #6B7684 · 세그먼트 비선택) — 기존 axe serious | **이 커밋 하나**면 색이 돌아간다 |
| `ca8b658` fix(fe) | 판정 영역 메타 · 게이지 · 라벨 줄바꿈 · 상세 주의 줄 위치 | 이 커밋 |
| `4ad0b6d` fix(fe) | 360 투자 화면 문서 넘침(필터 행 `fullWidth`) | 이 커밋 |

## 판단 — 리뷰가 볼 곳

1. **DVOL 을 방향이 아니라 σ 예측으로 쟀다** — 리서치 분류가 "방향 0 · 사이징"이다. 방향 IC 는 탐색 표에만(7일 ΔDVOL BTC +0.094 CI 하한 +0.001 — 한 칸이 겨우 0 위, 다중 비교 전이라 규칙에 넣지 않음)
2. **판정 (3) "비중 결과가 나빠지지 않는다"** — 예측이 나아져도 포트폴리오가 나빠지면 바꾸지 않는다. 이번에 그대로 걸렸다
3. **유의 게이트는 첫 검사 · fail-open** — 표본 게이트 뒤에 두면 표본 20 을 넘는 날 유의 종목에 "후보"가 처음 열린다. 표시를 못 읽으면 지금 화면 그대로(수집이 멈췄다고 모든 판정을 지우지 않는다)
4. **원장은 막지 않는다** — `judgment_ledger` · 판단 스냅샷은 규칙을 재는 표다. 유의 종목의 규칙 판단도 계속 기록된다
5. **보조 회색 토큰 변경은 앱 전체에 보인다**(`c21d49a`) — 사용자 요청으로 기존 대비 위반의 원인 토큰을 고쳤다. 판정 영역 12조합 axe serious 0
6. **BFF 는 막는 쪽으로만 고친다** — 서버가 유의 종목을 `renderable: true` 로 보내도 막힌다. 여는 경로는 0

## 하지 않는 것

- 업비트 공지 JSON(2026-09-23 결정) · DVOL 화면 표시 · 같은 과거 표본으로 `dvol-sigma@2`
- 주의(caution) 표시를 판정 점수에 반영 — `market-warning@1` 통계 전에는 사실 한 줄만
