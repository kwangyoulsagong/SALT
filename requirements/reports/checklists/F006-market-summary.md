# F006 슬라이스 1 — 투자 화면 시장 요약 띠 — 체크리스트

슬라이스: `requirements/specs/in-progress/F006-market-summary-slice.md` · 2026-09-22
브랜치: `feat/fe-market-summary-strip` (base `main` `c61b9f9`)
영역 체크리스트: `salt-server/…/SRV-REQ-036.md` · `bff/…/BFF-REQ-035.md` · `salt-microFe/…/FE-REQ-037.md`

## 요약

| 확인 | 결과 |
|---|---|
| 서버 → BFF → 화면 | 대표 BTC + 항목 6, 등락 금액 · 스파크라인 30점. 1440 · 390 스크린샷 |
| WS 등락 금액 | `price_update` 에 `change24hAmount`(거래소 값) |
| 프론트 상수 | 종목 목록 · 임계 0 |
| 번들 | `/investments` First Load 136 → 136 kB |
| 게이트 | 서버 build · test 250 · BFF build · test 75 · FE check-types · lint · test · storybook · web/web-tax 빌드 · layer-check(FE · 서버) |

## 미검증 · 범위 밖

영역 체크리스트 §미검증과 같다 — 태그 실화면(오늘 ±5% 없음), 로그인 상태 스모크, 첫 금액 vs WS 차이, 거래소 동시 7건, BFF 502/504 실측.
