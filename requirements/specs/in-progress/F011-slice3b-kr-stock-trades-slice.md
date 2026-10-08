---
id: SLICE-F011-3B-KR-STOCK-TRADES
title: "F011 슬라이스 3b — 국내 주식 거래 기록 · 보유 평가 · 유니버스 보유"
priority: high
labels: [F011, slice, server, bff, fe]
created: 2026-10-08
---

## Summary

슬라이스 3 이 국내 주식을 **보게** 했다. 3b 는 **기록하게** 한다 — 이미 한 국내 주식 거래를 코인과 같은 폼에 적으면 보유가 생기고,
서버가 가진 국내 주식 시세로 평가되고, 그 종목이 수집 대상(유니버스) 첫 순위가 된다. 주문 경로는 없다(수동 입력).

| 질문 | 결정 |
|---|---|
| 다음 작업 | "새 브랜치 파고 다음꺼 진행"(2026-10-08) — `FEATURE-011` 슬라이스 순서 3b |
| 보유 평가 | 코인은 BFF 가 업비트 시세를 5초마다 밀어 넣는다. 국내 주식 시세는 서버에 이미 있다 → **서버가 읽어서** 평가(기록 직후 · 시세 회차 뒤) |
| 유니버스 보유 | `market` 이 `portfolio` 표를 읽지 않는다 — 조립 지점이 `portfolio` 공개 API 를 넣는다(Port `KrHeldCodesSource`) |
| 계획 · 사이즈 계산 | 코치가 국내 주식을 모른다(계획 연결 · 리스크 스냅샷이 코인만) → 슬라이스 4. 화면은 칸을 그리지 않고 BFF 는 국내 주식 + 계획을 400 |
| 호가 단위 | 안내만(F011 FR-42 · 수동 입력 원칙). 배수 판정은 하지 않는다 — 가격대별 표가 서버에 있다 |
| 로고 · 상태 6종 화면 | 슬라이스 3 후속에서 끝났다(`58f0c33` · `09659d7`) |

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-040-F011-KR-STOCK.md` FR-11 · 33~36 | 거래 입력 `assetType` · 평가 · 유니버스 · `codes` · 시세 없는 종목 채우기 |
| BFF | `bff/requirements/specs/done/BFF-REQ-040-F011-KR-STOCK.md` FR-15 · 16 | 거래 `assetType` 통과 · 홈 요약 이름 · 로고 |
| FE | `salt-microFe/requirements/specs/done/FE-REQ-041-F011-KR-STOCK.md` FR-16~18 · `FE-REQ-039` Changelog | 상세 거래 폼 · 호가 안내 · 격자 · 요약 아이콘 |

## 커밋

- `422bc14` feat(server) — 거래 입력 `kr_stock` · 저장 시세 평가 · 유니버스 보유. 초점은 **컨텍스트 경계**(ACL 하나 · 조립 지점 지연 참조)
- `13cde7e` feat(server) — `assets?codes=`. 계약 추가 하나라 따로
- `ba2ddc6` feat(bff) — 거래 `assetType` · 요약 이름
- `137b876` feat(fe) — 상세 거래 폼
- `2449834` feat(server) — 장 밖 시세 없는 종목 채우기. **통합 확인에서 찾은 것**이라 기능 커밋과 나눴다

마이그레이션 없음 — 되돌리기는 커밋 revert 로 끝난다. 이미 적힌 `kr_stock` 거래 · 보유 행은 남는다(코인 경로는 자산군으로 걸러 영향 없음).

## 판단 — 리뷰가 볼 곳

1. **평가를 밀지 않고 읽는다** — 코인과 다른 경로를 하나 더 둔 이유(시세 소유자가 서버)
2. **조립 지점의 지연 참조** — `market` 이 `portfolio` 보다 먼저 조립되는데 유니버스가 보유를 알아야 한다. 부르는 쪽이 워커 회차라 조립 뒤다
3. **국내 주식 + 계획 400** — 버리지 않고 실패시킨다
4. **장 밖 채우기** — 매분 쿼리 두 번(대개 0건)을 밤새 더 쓴다

## 검증 · 미검증

`requirements/reports/checklists/F011-slice3b-kr-stock-trades.md` · 회고 `requirements/reports/retrospects/F011-slice3b-kr-stock-trades.md`.
