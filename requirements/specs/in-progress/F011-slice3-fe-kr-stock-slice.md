---
id: SLICE-F011-3-FE-KR-STOCK
title: "F011 슬라이스 3 — 투자 분석 자산군 탭(코인 · 국내 주식) · 같은 화면 데이터만 다르게 · 서버/BFF 계약 확장"
priority: high
labels: [F011, slice, fe, bff, server, db]
created: 2026-10-08
---

## Summary

슬라이스 2 가 세운 국내 주식 화면 계약의 첫 소비처. `/investments` 제목 아래 자산군 탭을 두고 탭 아래는 코인과 **같은 화면**이다.
같은 화면이 되려면 같은 데이터가 필요해 서버 · BFF 계약을 늘렸다(당일 고가/저가 · 정렬/순서/기간 · 관심 종목 `kr_stock`).

| 질문 | 결정 |
|---|---|
| 다음 작업 | "새 브랜치 파고 다음꺼 진행"(2026-10-08) — `FEATURE-011` 슬라이스 순서 3 |
| 화면 구조 | 사용자 "위에 투자분석 아래 탭 두개" · "똑같은 ui 똑같은 인터랙션" · "똑같은 화면이고 데이터만 다른거지" — 첫 판(세 번째 탭 · 다른 열 · 검색)을 버렸다 |
| 거래 기록 `kr_stock` | 범위 밖 → 슬라이스 3b(서버 포트폴리오 평가가 `MarketAsset` 가격만 본다) |
| 로고 | 사용자 결정 대기 — 그전엔 이름 이니셜 |

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| FE | `salt-microFe/requirements/specs/done/FE-REQ-041-F011-KR-STOCK.md`(신규) | 자산군 탭 · 공용 표 · 미리보기 · 관심 · WS 구독 · 상세 |
| BFF | `bff/requirements/specs/done/BFF-REQ-040-F011-KR-STOCK.md` FR-11~13 | 필터 · OHLC · 관심 종목 통과 |
| 서버 | `salt-server/requirements/specs/in-progress/SRV-REQ-040-F011-KR-STOCK.md` FR-29~31 | OHLC · 필터 · 기간 수익률 · 관심 종목 `kr_stock` |
| DB | `salt-server/requirements/specs/done/DB-REQ-033-F011-KR-STOCK.md` Changelog | `kr_stock_quotes` OHLC 3열 |

## 커밋

- `f136b6d` feat(server) — OHLC · 필터 · 관심 종목. 마이그레이션 포함 — 되돌리려면 이 커밋 + `DROP COLUMN`
- `36ad645` feat(bff) — 필터 검증 · 필드 옮김 · 관심 종목 통과
- `3431c4d` fix(fe) — 관심 별 클릭 전파. **코인 표에도 있던 기존 버그**라 기능 커밋과 나눴다
- `2af31e0` feat(fe) — 자산군 탭 · 같은 화면

서버 · BFF · FE 를 나눈 이유: 영역마다 리뷰어가 다르고 계약 변경이 단계마다 있다(서버 필드 → BFF 옮김 → 화면).

## 판단 — 리뷰가 볼 곳

1. **화면을 자산군으로 매개변수화** — 새 표를 만들지 않고 국내 주식 행을 코인 행 모양으로(`krQuoteToOverviewItem`). 다른 것은 데이터 소스 · 구독 · 머리 첫 칸 · 배지
2. **필터 값을 코인 문자열 그대로** — `""` · `7d` 까지 서버가 받는다. 계약 한 벌
3. **탭 노출 = 소유자 판정** — 장 상태 `ok` · `unavailable` 이면 탭, 404 · `disabled` · 비로그인이면 탭 없음(화면 전과 같음)
4. **국내 주식 탭에선 목표 비중 · 위험 · 판정 띠와 시장 요약 띠를 숨긴다** — 코인 숫자다
5. **상세 메타데이터에 시세 없음 · noindex** — 공개 HTML 에 국내 주식 시세 0(KRX 재배포)

## 검증 · 미검증

`requirements/reports/checklists/F011-slice3-fe-kr-stock.md` · 회고 `requirements/reports/retrospects/F011-slice3-fe-kr-stock.md`.
