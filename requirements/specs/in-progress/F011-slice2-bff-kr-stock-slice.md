---
id: SLICE-F011-2-BFF-KR-STOCK
title: "F011 슬라이스 2 — 국내 주식 화면 계약(/api/app/market/kr/*) · 실시간 체결 중계(서버 SSE → WS price_update)"
priority: high
labels: [F011, slice, bff]
created: 2026-10-08
---

## Summary

슬라이스 0 · 1 이 서버에 국내 주식 시세 · 봉 · 체결 SSE 를 만들었지만 소비처가 없었다. 이 슬라이스는 앱이 받을 계약을 세운다.
화면은 없다(슬라이스 3 `FE-REQ-041` 이 첫 소비처).

| 질문 | 결정 |
|---|---|
| 다음 작업 | "새 브랜치 파고 다음꺼 진행"(2026-10-08) — `FEATURE-011` 슬라이스 순서 2(BFF) |

| 영역 | REQ | 이 슬라이스 몫 |
|---|---|---|
| BFF | `bff/requirements/specs/done/BFF-REQ-040-F011-KR-STOCK.md`(신규) | REST 5경로 뷰모델 · WS 국내 주식 구독 · 연결별 SSE 중계 |
| 서버 · FE | `SRV-REQ-040` · `FE-REQ-041` | 변경 없음 · 다음 슬라이스 |

## 커밋

- REST — 뷰모델 · 서비스 · 컨트롤러 · `/kr` 라우터(코인 `/:symbol` 앞)
- 실시간 — `kr-stream.manager` · WS `assetType` 분기 · 코인 `assetType: "crypto"`
- 문서 — REQ · 체크리스트 · 회고 · FEATURE-011 · 마스터 인덱스 · 규칙 2

REST 와 실시간을 나눈 이유: 실시간은 연결 수명 · 재연결 · 토큰 보관이라는 다른 판단을 담는다. 되돌릴 때 하나만 revert 한다.

## 판단 — 리뷰가 볼 곳

1. **BFF 캐시 버림** — 기획의 "정규장 1s · 그 외 60s". 소유자 판정 응답을 공유 캐시에 두면 비소유자에게 샌다
2. **upstream SSE 를 연결마다 연다** — 하나로 뿌리면 비소유자 연결에 간다. 상한 20 중계 · 연결당 100코드
3. **토큰을 구독 메시지에 싣는다** — 브라우저 WS 는 헤더를 못 단다. 만료 뒤 다시 구독으로 이어 붙는다. 토큰은 중계 맵 · 클로저에만
4. **업비트 구독 집합과 섞지 않는다** — 6자리 코드가 업비트 요청에 들어가지 않게 별도 집합
5. **503 키 없음 → 200 `disabled`** — 재시도 래퍼보다 먼저 값으로 바꿔 다시 부르지 않는다. 404 는 그대로(비소유자에게 존재를 알리지 않는다)
6. **체결 필드를 코인 이름으로** — `changeRate → change24h`. 업비트 값도 전일 종가 대비라 뜻이 같다

## 검증 · 미검증

`requirements/reports/checklists/F011-slice2-bff-kr-stock.md` · 회고 `requirements/reports/retrospects/F011-slice2-bff-kr-stock.md`.
